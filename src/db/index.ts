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
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

let db: Database.Database | null = null;
let currentDbPath: string | null = null;

type ChangeListener = () => void;
const changeListeners: ChangeListener[] = [];

export function onJobChange(fn: ChangeListener): void {
  changeListeners.push(fn);
}

function notifyChange(): void {
  for (const fn of changeListeners) fn();
}

export function getDatabase(dbPath?: string): Database.Database {
  const filePath = dbPath || process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');
  if (!db || currentDbPath !== filePath) {
    if (db) {
      db.close();
    }
    currentDbPath = filePath;
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
      retryCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const columns = database.prepare("PRAGMA table_info(jobs)").all() as { name: string }[];
  const hasRetryCount = columns.some((col) => col.name === 'retryCount');
  if (!hasRetryCount) {
    database.exec('ALTER TABLE jobs ADD COLUMN retryCount INTEGER NOT NULL DEFAULT 0');
  }
}

export function createJob(id: string, topic?: string): Job {
  const database = getDatabase();
  const stmt = database.prepare(
    'INSERT INTO jobs (id, topic, status) VALUES (?, ?, ?)'
  );
  stmt.run(id, topic || null, 'pending');
  notifyChange();
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
  notifyChange();

  return getJob(id);
}

export function getAllJobs(): Job[] {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM jobs ORDER BY createdAt DESC');
  return stmt.all() as Job[];
}

export function resetDatabase(): void {
  if (db) {
    try {
      db.exec('DELETE FROM jobs');
    } catch {
      // Table might not exist yet
    }
    db.close();
    db = null;
    currentDbPath = null;
  }
}

export function resetJobForRetry(id: string): Job | null {
  const database = getDatabase();
  const stmt = database.prepare(
    `UPDATE jobs SET status = 'pending', error = NULL, videoPath = NULL, retryCount = retryCount + 1, updatedAt = datetime('now') WHERE id = ?`
  );
  stmt.run(id);
  return getJob(id);
}
