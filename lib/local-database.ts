import { Platform } from 'react-native';

let SQLite: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SQLite = require('expo-sqlite');
}

class LocalDatabase {
  private db: any = null;

  async init() {
    if (Platform.OS === 'web') {
      console.log('[LocalDB] Skipping SQLite init on web');
      return false;
    }
    try {
      this.db = await SQLite.openDatabaseAsync('vgp_local.db');
      console.log('[LocalDB] Database opened successfully');
      await this.createTables();
      return true;
    } catch (error) {
      console.error('[LocalDB] Error initializing database:', error);
      return false;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        adresse TEXT NOT NULL,
        contactNom TEXT,
        contactPrenom TEXT,
        contactEmail TEXT,
        contactTelephone TEXT,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        dateMiseEnService TEXT,
        numeroSerie TEXT,
        constructeur TEXT,
        modele TEXT,
        typeMachine TEXT,
        dateDerniereVGP TEXT,
        prochaineVGP TEXT,
        periodicite INTEGER,
        observations TEXT,
        referenceClient TEXT,
        force TEXT,
        anneeMiseEnService TEXT,
        customFields TEXT,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        nom TEXT,
        prenom TEXT,
        clientId TEXT,
        qualifications TEXT,
        resetToken TEXT,
        resetTokenExpiry TEXT,
        isActive INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS vgp_history (
        id TEXT PRIMARY KEY,
        machineId TEXT NOT NULL,
        dateControl TEXT NOT NULL,
        controllerId TEXT,
        status TEXT,
        observations TEXT,
        checkpoints TEXT,
        photos TEXT,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS scheduled_events (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        machineId TEXT,
        controllerId TEXT NOT NULL,
        scheduledDate TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS interventions (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        machineId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        type TEXT NOT NULL,
        assignedTo TEXT,
        dueDate TEXT,
        completedAt TEXT,
        estimatedCost REAL,
        actualCost REAL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS parts (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        quantity INTEGER NOT NULL,
        unitPrice REAL,
        location TEXT,
        minStock INTEGER,
        supplier TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        machineId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        report_number TEXT NOT NULL,
        clientId TEXT NOT NULL,
        organisme TEXT,
        client_reference TEXT,
        categorie TEXT,
        date_verification TEXT,
        date_rapport TEXT,
        signataire_nom TEXT,
        has_observations INTEGER,
        pieces_jointes TEXT,
        adresse_facturation_raw TEXT,
        raw_payload TEXT,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS report_inspections (
        id TEXT PRIMARY KEY,
        reportId TEXT NOT NULL,
        machineId TEXT NOT NULL,
        titre_section TEXT,
        mission_code TEXT,
        texte_reference TEXT,
        resultat_status TEXT,
        resultat_comment TEXT,
        particularites_json TEXT,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS report_observations (
        id TEXT PRIMARY KEY,
        inspectionId TEXT NOT NULL,
        numero TEXT,
        point_de_controle TEXT,
        observation TEXT,
        date_1er_constat TEXT,
        page TEXT,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS custom_field_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        required INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS checkpoint_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        orderIndex INTEGER,
        createdAt TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0,
        syncedAt TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        success INTEGER NOT NULL,
        error_message TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS outbox (
        event_id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
        payload_json TEXT NOT NULL,
        client_timestamp INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'ACK', 'ERROR')),
        retries INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status)`,
      `CREATE INDEX IF NOT EXISTS idx_outbox_entity ON outbox(entity)`
    ];

    for (const sql of tables) {
      await this.db.execAsync(sql);
    }
    
    console.log('[LocalDB] Tables created successfully');
  }

  async select<T>(table: string, where?: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const sql = where 
      ? `SELECT * FROM ${table} WHERE ${where}` 
      : `SELECT * FROM ${table}`;
    
    const result = await this.db.getAllAsync(sql);
    return result as T[];
  }

  async insert(table: string, data: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const dataWithSync = {
      ...data,
      lastModified: now,
      isSynced: 0,
    };
    
    const keys = Object.keys(dataWithSync);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(dataWithSync);
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.db.runAsync(sql, values);
  }

  async update(table: string, data: Record<string, any>, where: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const dataWithSync = {
      ...data,
      lastModified: now,
      isSynced: 0,
    };
    
    const sets = Object.keys(dataWithSync).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(dataWithSync)];
    
    const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`;
    await this.db.runAsync(sql, values);
  }

  async delete(table: string, where: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    await this.db.runAsync(sql);
  }

  async clear(table: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const sql = `DELETE FROM ${table}`;
    await this.db.runAsync(sql);
  }

  async getUnsyncedRecords(table: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(`SELECT * FROM ${table} WHERE isSynced = 0`);
  }

  async markAsSynced(table: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE ${table} SET isSynced = 1, syncedAt = ? WHERE id = ?`,
      [now, id]
    );
  }

  async logSync(action: string, tableName: string, recordId: string, success: boolean, errorMessage?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT INTO sync_log (timestamp, action, table_name, record_id, success, error_message) VALUES (?, ?, ?, ?, ?, ?)`,
      [new Date().toISOString(), action, tableName, recordId, success ? 1 : 0, errorMessage || null]
    );
  }

  async getLastSyncTime(): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync(
      `SELECT timestamp FROM sync_log WHERE success = 1 ORDER BY timestamp DESC LIMIT 1`
    ) as { timestamp: string } | null;
    return result?.timestamp || null;
  }

  async addToOutbox(event: {
    eventId: string;
    entity: string;
    entityId: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: Record<string, any>;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO outbox (event_id, entity, entity_id, operation, payload_json, client_timestamp, status, retries, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
      [event.eventId, event.entity, event.entityId, event.operation, JSON.stringify(event.payload), Date.now(), now]
    );
    console.log(`[LocalDB] Added event to outbox: ${event.operation} ${event.entity}/${event.entityId}`);
  }

  async getPendingOutboxEvents(): Promise<{
    event_id: string;
    entity: string;
    entity_id: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    payload_json: string;
    client_timestamp: number;
    status: string;
    retries: number;
    last_error: string | null;
  }[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(
      `SELECT * FROM outbox WHERE status IN (?, ?) AND retries < ? ORDER BY client_timestamp ASC`,
      ['PENDING', 'ERROR', 5]
    );
  }

  async markOutboxEventStatus(eventId: string, status: 'SENT' | 'ACK' | 'ERROR', error?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (status === 'ERROR') {
      await this.db.runAsync(
        `UPDATE outbox SET status = ?, retries = retries + 1, last_error = ? WHERE event_id = ?`,
        [status, error || null, eventId]
      );
    } else {
      await this.db.runAsync(
        `UPDATE outbox SET status = ? WHERE event_id = ?`,
        [status, eventId]
      );
    }
  }

  async clearAcknowledgedOutbox(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(`DELETE FROM outbox WHERE status = ?`, ['ACK']);
    console.log('[LocalDB] Cleared acknowledged outbox events');
  }

  async getSyncState(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync(
      `SELECT value FROM sync_state WHERE key = ?`,
      [key]
    ) as { value: string } | null;
    return result?.value || null;
  }

  async setSyncState(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  async getLastPulledRevision(): Promise<number> {
    const value = await this.getSyncState('lastPulledRevision');
    return value ? parseInt(value, 10) : 0;
  }

  async setLastPulledRevision(revision: number): Promise<void> {
    await this.setSyncState('lastPulledRevision', revision.toString());
  }

  async applyRemoteChange(change: {
    entity: string;
    entity_id: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: Record<string, any>;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const { entity, entity_id, operation, payload } = change;
    const now = new Date().toISOString();
    
    try {
      if (operation === 'DELETE') {
        await this.db.runAsync(`DELETE FROM ${entity} WHERE id = ?`, [entity_id]);
      } else if (operation === 'CREATE') {
        const dataWithSync = { ...payload, lastModified: now, isSynced: 1, syncedAt: now };
        const keys = Object.keys(dataWithSync);
        const placeholders = keys.map(() => '?').join(', ');
        await this.db.runAsync(
          `INSERT OR REPLACE INTO ${entity} (${keys.join(', ')}) VALUES (${placeholders})`,
          Object.values(dataWithSync)
        );
      } else if (operation === 'UPDATE') {
        const dataWithSync = { ...payload, lastModified: now, isSynced: 1, syncedAt: now };
        const sets = Object.keys(dataWithSync).map(k => `${k} = ?`).join(', ');
        await this.db.runAsync(
          `UPDATE ${entity} SET ${sets} WHERE id = ?`,
          [...Object.values(dataWithSync), entity_id]
        );
      }
      console.log(`[LocalDB] Applied remote change: ${operation} ${entity}/${entity_id}`);
    } catch (error) {
      console.error(`[LocalDB] Error applying remote change:`, error);
      throw error;
    }
  }

  async bulkInsert(table: string, records: Record<string, any>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    
    await this.db.withTransactionAsync(async () => {
      for (const record of records) {
        const dataWithSync = {
          ...record,
          lastModified: now,
          isSynced: 1,
          syncedAt: now,
        };
        
        const keys = Object.keys(dataWithSync);
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(dataWithSync);
        
        const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        await this.db!.runAsync(sql, values);
      }
    });
  }
}

export const localDB = new LocalDatabase();
