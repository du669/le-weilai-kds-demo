import { backup, DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.env.DB_FILE || join(root, 'data', process.env.DEMO_SEED === '1' ? 'demo.sqlite' : 'restaurant.sqlite'));
if (!existsSync(source)) throw new Error(`数据库不存在：${source}`);
const backupDir = resolve(process.env.BACKUP_DIR || join(root, 'data', 'backups'));
mkdirSync(backupDir, { recursive: true });
const name = `le-weilai-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
const destination = join(backupDir, name);
const db = new DatabaseSync(source, { readOnly: true });
await backup(db, destination);
db.close();
console.log(`备份完成：${destination}`);
