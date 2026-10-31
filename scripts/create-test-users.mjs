import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import 'dotenv/config';

// Use a dedicated development database and provide a password explicitly.
const DATABASE_URL = process.env.DATABASE_URL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
if (!DATABASE_URL || !TEST_USER_PASSWORD) {
  throw new Error('DATABASE_URL and TEST_USER_PASSWORD must be configured');
}

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // 1. 현재 관리자 계정 확인
  console.log('\n=== 현재 관리자 계정 ===');
  const [admins] = await conn.execute(
    "SELECT id, email, name, role, createdAt FROM registered_users WHERE role = 'admin' LIMIT 5"
  );
  console.log(JSON.stringify(admins, null, 2));

  // 2. 전체 사용자 수 확인
  const [countResult] = await conn.execute('SELECT COUNT(*) as cnt FROM registered_users');
  console.log('\n전체 사용자 수:', countResult[0].cnt);

  // 3. 테스트 사용자 3개 생성
  const testUsers = [
    { email: 'test1@example.com', name: '테스트유저1', nameJa: 'テストユーザー1', password: TEST_USER_PASSWORD, role: 'user' },
    { email: 'test2@example.com', name: '테스트유저2', nameJa: 'テストユーザー2', password: TEST_USER_PASSWORD, role: 'user' },
    { email: 'test3@example.com', name: '테스트유저3', nameJa: 'テストユーザー3', password: TEST_USER_PASSWORD, role: 'user' },
  ];

  console.log('\n=== 테스트 사용자 생성 ===');
  for (const u of testUsers) {
    // 이미 존재하는지 확인
    const [existing] = await conn.execute('SELECT id FROM registered_users WHERE email = ?', [u.email]);
    if (existing.length > 0) {
      console.log(`이미 존재: ${u.email} (id: ${existing[0].id})`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await conn.execute(
      'INSERT INTO registered_users (email, name, nameJa, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [u.email, u.name, u.nameJa, hash, u.role]
    );
    console.log(`생성 완료: ${u.email}`);
  }

  // 4. 최종 사용자 목록 출력
  console.log('\n=== 전체 사용자 목록 ===');
  const [allUsers] = await conn.execute(
    'SELECT id, email, name, role, createdAt FROM registered_users ORDER BY id'
  );
  console.log(JSON.stringify(allUsers, null, 2));

  await conn.end();
}

main().catch(console.error);
