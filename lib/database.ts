import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT || Constants.expoConfig?.extra?.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE || Constants.expoConfig?.extra?.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN || Constants.expoConfig?.extra?.EXPO_PUBLIC_RORK_DB_TOKEN;

interface QueryResponse<T> {
  result?: T[];
  error?: string;
}

class Database {
  private endpoint: string;
  private namespace: string;
  private token: string;
  private isAvailable: boolean = false;

  constructor() {
    if (Platform.OS === 'web') {
      console.log('[Database] Skipping database initialization on web');
      this.endpoint = '';
      this.namespace = '';
      this.token = '';
      return;
    }
    
    if (!DB_ENDPOINT || !DB_NAMESPACE || !DB_TOKEN) {
      console.warn('[Database] Configuration de la base de données manquante - mode local uniquement');
      this.endpoint = '';
      this.namespace = '';
      this.token = '';
      return;
    }
    this.endpoint = DB_ENDPOINT;
    this.namespace = DB_NAMESPACE;
    this.token = DB_TOKEN;
    console.log('[Database] Initialized with endpoint:', this.endpoint);
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = this.endpoint.endsWith('/sql') ? this.endpoint : `${this.endpoint}/sql`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'Surreal-NS': this.namespace,
          'Surreal-DB': 'main',
        },
        body: 'SELECT 1',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      this.isAvailable = response.ok;
      if (this.isAvailable) {
        console.log('[Database] ✅ Connection successful');
      } else {
        console.warn('[Database] ⚠️ Database not available (status:', response.status, ')');
        console.warn('[Database] ⚠️ Falling back to local demo data mode');
      }
      return this.isAvailable;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('[Database] ⚠️ Connection timeout (5s) - using local mode');
      } else {
        console.warn('[Database] ⚠️ Cannot connect to database:', error.message);
      }
      console.warn('[Database] ⚠️ Using local demo data mode');
      this.isAvailable = false;
      return false;
    }
  }

  getAvailability(): boolean {
    return this.isAvailable;
  }

  private async query<T>(sql: string): Promise<T[]> {
    if (!this.isAvailable) {
      throw new Error('Database not available');
    }

    try {
      const url = this.endpoint.endsWith('/sql') ? this.endpoint : `${this.endpoint}/sql`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'Surreal-NS': this.namespace,
          'Surreal-DB': 'main',
        },
        body: sql,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }

      const data: QueryResponse<T> = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.result || [];
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[Database] Query timeout (10s)');
      }
      this.isAvailable = false;
      throw error;
    }
  }

  async initTables() {
    if (!this.isAvailable) {
      console.log('[Database] Skipping table initialization (database not available)');
      return;
    }

    console.log('[Database] Initializing tables...');
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        adresse TEXT NOT NULL,
        contactNom TEXT,
        contactPrenom TEXT,
        contactEmail TEXT,
        contactTelephone TEXT,
        createdAt TEXT NOT NULL
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
        customFields TEXT
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
        createdAt TEXT NOT NULL
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
        createdAt TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS scheduled_events (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        machineId TEXT,
        controllerId TEXT NOT NULL,
        scheduledDate TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL
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
        updatedAt TEXT NOT NULL
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
        updatedAt TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        machineId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        createdAt TEXT NOT NULL
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
        createdAt TEXT NOT NULL
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
        particularites_json TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS report_observations (
        id TEXT PRIMARY KEY,
        inspectionId TEXT NOT NULL,
        numero TEXT,
        point_de_controle TEXT,
        observation TEXT,
        date_1er_constat TEXT,
        page TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS custom_field_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        required INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS checkpoint_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        orderIndex INTEGER,
        createdAt TEXT NOT NULL
      )`
    ];

    for (const sql of tables) {
      await this.query(sql);
    }
    
    console.log('[Database] Tables initialized successfully');
  }

  async select<T>(table: string, where?: string): Promise<T[]> {
    const sql = where 
      ? `SELECT * FROM ${table} WHERE ${where}` 
      : `SELECT * FROM ${table}`;
    return this.query<T>(sql);
  }

  async insert(table: string, data: Record<string, any>): Promise<void> {
    const keys = Object.keys(data);
    const values = Object.values(data).map(v => 
      v === null ? 'NULL' : 
      typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : 
      typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` :
      v
    );
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
    await this.query(sql);
  }

  async update(table: string, data: Record<string, any>, where: string): Promise<void> {
    const sets = Object.entries(data).map(([key, value]) => {
      const val = value === null ? 'NULL' : 
        typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : 
        typeof value === 'object' ? `'${JSON.stringify(value).replace(/'/g, "''")}'` :
        value;
      return `${key} = ${val}`;
    });
    
    const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE ${where}`;
    await this.query(sql);
  }

  async delete(table: string, where: string): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    await this.query(sql);
  }

  async clear(table: string): Promise<void> {
    const sql = `DELETE FROM ${table}`;
    await this.query(sql);
  }
}

export const db = new Database();
