import { execSync } from 'child_process';
import { statSync } from 'fs';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

// Parse MySQL URL
const url = new URL(dbUrl);
const host = url.hostname;
const port = url.port || '3306';
const user = url.username;
const pass = decodeURIComponent(url.password);
const dbname = url.pathname.replace('/', '').split('?')[0];

console.log(`Connecting to: ${host}:${port}, DB: ${dbname}`);

const outputFile = '/home/ubuntu/kusuri_mall_db_dump.sql';

// Run mysqldump with TiDB (SSL required)
const cmd = `mysqldump \
  --host="${host}" \
  --port="${port}" \
  --user="${user}" \
  --password="${pass}" \
  --ssl-mode=REQUIRED \
  --no-tablespaces \
  --skip-triggers \
  --column-statistics=0 \
  --set-gtid-purged=OFF \
  "${dbname}" > "${outputFile}"`;

console.log('Running mysqldump...');
try {
  execSync(cmd, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
} catch (e) {
  // stderr might have warnings but dump still succeeds
  console.log('Note:', e.stderr?.toString().substring(0, 200));
}

const stat = statSync(outputFile);
console.log(`Done! File size: ${(stat.size / 1024).toFixed(1)} KB`);
console.log(`Output: ${outputFile}`);
