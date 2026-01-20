import { Platform } from 'react-native';
import { localDB } from './local-database';
import { outboxManager } from './outbox-manager';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  progress: number;
}

type SyncListener = (state: SyncState) => void;

interface PushResult {
  event_id: string;
  status: 'ACK' | 'ERROR' | 'DUPLICATE';
  error?: string;
  revision?: number;
}

interface PullChange {
  revision: number;
  entity: string;
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, any>;
  server_timestamp: string;
  event_id: string;
}

class SyncService {
  private listeners: SyncListener[] = [];
  private syncState: SyncState = {
    status: 'idle',
    lastSync: null,
    error: null,
    progress: 0,
  };
  private syncInProgress = false;
  private autoSyncEnabled = true;
  private deviceId: string = '';
  private apiBaseUrl: string = '';

  constructor() {
    if (Platform.OS !== 'web') {
      this.initNetworkListener();
      this.loadLastSyncTime();
      this.initDeviceId();
      this.apiBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';
    }
  }

  private async initDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      this.deviceId = deviceId;
      console.log('[SyncService] Device ID:', this.deviceId);
    } catch (error) {
      console.error('[SyncService] Error initializing device ID:', error);
      this.deviceId = `device_${Date.now()}`;
    }
  }

  private async loadLastSyncTime() {
    try {
      const lastSync = await localDB.getLastSyncTime();
      this.updateState({ lastSync });
    } catch (error) {
      console.log('[SyncService] Could not load last sync time:', error);
    }
  }

  private initNetworkListener() {
    NetInfo.addEventListener(state => {
      console.log('[SyncService] Network state changed:', state.isConnected);
      if (state.isConnected && this.autoSyncEnabled && !this.syncInProgress) {
        this.syncWithRemote();
      }
    });
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    listener(this.syncState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private updateState(updates: Partial<SyncState>) {
    this.syncState = { ...this.syncState, ...updates };
    this.listeners.forEach(listener => listener(this.syncState));
  }

  async enableAutoSync(enabled: boolean) {
    this.autoSyncEnabled = enabled;
    await AsyncStorage.setItem('autoSyncEnabled', JSON.stringify(enabled));
  }

  async syncWithRemote(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('[SyncService] Sync not available on web');
      return false;
    }
    if (this.syncInProgress) {
      console.log('[SyncService] Sync already in progress');
      return false;
    }

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      console.log('[SyncService] No network connection');
      this.updateState({ 
        status: 'error', 
        error: 'Pas de connexion réseau' 
      });
      return false;
    }

    console.log('[SyncService] Starting synchronization...');
    this.syncInProgress = true;
    this.updateState({ status: 'syncing', error: null, progress: 0 });

    try {
      this.updateState({ progress: 10 });
      await this.pushToServer();
      
      this.updateState({ progress: 50 });
      await this.pullFromServer();
      
      this.updateState({ progress: 90 });
      await outboxManager.clearAcknowledged();

      const now = new Date().toISOString();
      await localDB.logSync('full_sync', 'all', 'all', true);
      
      this.updateState({ 
        status: 'success', 
        lastSync: now,
        progress: 100 
      });

      console.log('[SyncService] ✅ Synchronization completed successfully');
      return true;
    } catch (error: any) {
      console.error('[SyncService] ❌ Sync error:', error);
      this.updateState({ 
        status: 'error', 
        error: error.message || 'Erreur de synchronisation',
        progress: 0 
      });
      return false;
    } finally {
      this.syncInProgress = false;
      setTimeout(() => {
        if (this.syncState.status !== 'syncing') {
          this.updateState({ status: 'idle' });
        }
      }, 3000);
    }
  }

  private async pushToServer(): Promise<boolean> {
    const pendingEvents = await outboxManager.getPendingEvents();
    
    if (pendingEvents.length === 0) {
      console.log('[SyncService] No pending events to push');
      return true;
    }

    console.log(`[SyncService] Pushing ${pendingEvents.length} events to server...`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trpc/sync.push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            deviceId: this.deviceId,
            events: pendingEvents.map(e => ({
              event_id: e.event_id,
              entity: e.entity,
              entity_id: e.entity_id,
              operation: e.operation,
              payload_json: e.payload_json,
              client_timestamp: e.client_timestamp,
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Push failed: ${response.status}`);
      }

      const data = await response.json();
      const results: PushResult[] = data.result?.data?.json?.results || [];

      for (const result of results) {
        if (result.status === 'ACK' || result.status === 'DUPLICATE') {
          await outboxManager.markEventAcknowledged(result.event_id);
          console.log(`[SyncService] Event ${result.event_id} acknowledged`);
        } else if (result.status === 'ERROR') {
          await outboxManager.markEventError(result.event_id, result.error || 'Unknown error');
          console.error(`[SyncService] Event ${result.event_id} error: ${result.error}`);
        }
      }

      const ackCount = results.filter(r => r.status === 'ACK' || r.status === 'DUPLICATE').length;
      console.log(`[SyncService] Push complete: ${ackCount}/${pendingEvents.length} acknowledged`);
      
      return true;
    } catch (error: any) {
      console.error('[SyncService] Push error:', error);
      throw error;
    }
  }

  private async pullFromServer(): Promise<boolean> {
    const sinceRevision = await outboxManager.getLastPulledRevision();
    console.log(`[SyncService] Pulling changes since revision ${sinceRevision}...`);

    let hasMore = true;
    let currentRevision = sinceRevision;
    let totalChanges = 0;

    while (hasMore) {
      try {
        const response = await fetch(
          `${this.apiBaseUrl}/api/trpc/sync.pull?input=${encodeURIComponent(JSON.stringify({ json: { sinceRevision: currentRevision, limit: 100 } }))}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Pull failed: ${response.status}`);
        }

        const data = await response.json();
        const result = data.result?.data?.json;
        
        if (!result) {
          console.log('[SyncService] No pull result received');
          break;
        }

        const changes: PullChange[] = result.changes || [];
        hasMore = result.hasMore || false;

        if (changes.length === 0) {
          console.log('[SyncService] No new changes');
          break;
        }

        console.log(`[SyncService] Received ${changes.length} changes, applying...`);

        const latestRevision = await outboxManager.applyRemoteChanges(
          changes.map(c => ({
            revision: c.revision,
            entity: c.entity,
            entity_id: c.entity_id,
            operation: c.operation,
            payload: c.payload,
          }))
        );

        currentRevision = latestRevision;
        totalChanges += changes.length;

        console.log(`[SyncService] Applied ${changes.length} changes, new revision: ${latestRevision}`);
      } catch (error: any) {
        console.error('[SyncService] Pull error:', error);
        throw error;
      }
    }

    console.log(`[SyncService] Pull complete: ${totalChanges} total changes applied`);
    return true;
  }

  getSyncState(): SyncState {
    return this.syncState;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }

  getDeviceId(): string {
    return this.deviceId;
  }
}

export const syncService = new SyncService();
