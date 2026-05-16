import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  topic: string | null;
  script: string | null;
  videoPath: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

let db: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (!db) {
    const filePath = dbPath || path.join(process.cwd(), 'data', 'app.db');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(filePath);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      topic TEXT,
      script TEXT,
      videoPath TEXT,
      error TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export function createJob(id: string, topic?: string): Job {
  const database = getDatabase();
  const stmt = database.prepare(
    'INSERT INTO jobs (id, topic, status) VALUES (?, ?, ?)'
  );
  stmt.run(id, topic || null, 'pending');
  return getJob(id)!;
}

export function getJob(id: string): Job | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM jobs WHERE id = ?');
  return (stmt.get(id) as Job) || null;
}

export function updateJobStatus(
  id: string,
  status: Job['status'],
  updates?: { script?: string; videoPath?: string; error?: string }
): Job | null {
  const database = getDatabase();
  const fields = ['status = ?', 'updatedAt = datetime(\'now\')'];
  const values: (string | null)[] = [status];

  if (updates?.script !== undefined) {
    fields.push('script = ?');
    values.push(updates.script);
  }
  if (updates?.videoPath !== undefined) {
    fields.push('videoPath = ?');
    values.push(updates.videoPath);
  }
  if (updates?.error !== undefined) {
    fields.push('error = ?');
    values.push(updates.error);
  }

  values.push(id);

  const stmt = database.prepare(
    `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`
  );
  stmt.run(...values);

  return getJob(id);
}

export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
