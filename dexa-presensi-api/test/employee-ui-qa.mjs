import 'dotenv/config';
import mysql from 'mysql2/promise';
import argon2 from 'argon2';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
const fixturePath = resolve('test/.employee-ui-fixture.json');
try {
  if (process.argv[2] === 'cleanup') {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
    const [records] = await db.query(
      'SELECT id,check_in_photo_key,check_out_photo_key FROM attendances WHERE employee_id=?',
      [fixture.employeeId],
    );
    await db.query('DELETE FROM audit_logs WHERE actor_user_id=?', [fixture.userId]);
    await db.query('DELETE FROM attendances WHERE employee_id=?', [fixture.employeeId]);
    await db.query('DELETE FROM employees WHERE id=?', [fixture.employeeId]);
    await db.query('DELETE FROM users WHERE id=?', [fixture.userId]);
    for (const row of records)
      for (const key of [row.check_in_photo_key, row.check_out_photo_key])
        if (key) await unlink(resolve(process.env.UPLOAD_DIR || 'storage', key)).catch(() => {});
    await unlink(fixturePath);
    console.log('UI fixture cleaned up');
  } else {
    try {
      await readFile(fixturePath);
      throw new Error('Clean up existing UI fixture first');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const userId = randomUUID(),
      employeeId = randomUUID(),
      photoKey = `${randomUUID()}.png`,
      attendanceId = randomUUID();
    const email = `qa-${userId.slice(0, 8)}@example.test`,
      password = `QaOnly-${randomUUID()}`;
    const buffer = await sharp({
      create: { width: 300, height: 400, channels: 3, background: '#b51d2a' },
    })
      .png()
      .toBuffer();
    await mkdir(resolve(process.env.UPLOAD_DIR || 'storage'), { recursive: true });
    await writeFile(resolve(process.env.UPLOAD_DIR || 'storage', photoKey), buffer);
    const timezone = process.env.BUSINESS_TIMEZONE || 'Asia/Jakarta';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts();
    const value = (type) => parts.find((p) => p.type === type).value;
    const day = `${value('year')}-${value('month')}-${value('day')}`;
    const previous = new Date(Date.parse(`${day}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    await db.beginTransaction();
    await db.execute(
      'INSERT INTO users (id,email,password_hash,role,is_active) VALUES (?,?,?,?,1)',
      [userId, email, await argon2.hash(password), 'EMPLOYEE'],
    );
    await db.execute(
      'INSERT INTO employees (id,user_id,employee_number,full_name,department) VALUES (?,?,?,?,?)',
      [employeeId, userId, `QA-${userId.slice(0, 8)}`, 'Mobile QA Employee', 'Quality Assurance'],
    );
    await db.execute(
      'INSERT INTO attendances (id,employee_id,work_date,check_in_at,check_in_photo_key) VALUES (?,?,?,?,?)',
      [attendanceId, employeeId, previous, `${previous} 01:00:00`, photoKey],
    );
    await db.commit();
    const fixture = {
      userId,
      employeeId,
      email,
      password,
      attendanceId,
      photo: resolve(process.env.UPLOAD_DIR || 'storage', photoKey),
    };
    await writeFile(fixturePath, JSON.stringify(fixture));
    console.log(JSON.stringify(fixture));
  }
} finally {
  await db.end();
}
