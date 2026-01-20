import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { syncService } from '@/lib/sync-service';

interface SyncState {
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  error: string | null;
  progress: number;
}

export const [SyncProvider, useSync] = createContextHook(() => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSync: null,
    error: null,
    progress: 0,
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
    });

    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    if (Platform.OS === 'web') {
      console.log('[SyncProvider] Sync not available on web');
      return false;
    }
    return await syncService.syncWithRemote();
  };

  return {
    syncState,
    triggerSync,
    isSyncing: Platform.OS !== 'web' ? syncService.isSyncing() : false,
  };
});
