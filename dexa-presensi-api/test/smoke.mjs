import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import sharp from 'sharp';

const base = `http://127.0.0.1:${process.env.PORT || 3000}/api`;
const marker = randomUUID().slice(0, 8);
const email = `smoke-${marker}@example.test`;
const password = `Smoke-${randomUUID()}`;
const employeeNumber = `SMOKE-${marker}`;
const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
  .png()
  .toBuffer();
let employeeId;

async function call(path, { method = 'GET', token, body, photo } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (photo) {
    payload = new FormData();
    payload.append('photo', new Blob([png], { type: 'image/png' }), 'proof.png');
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const response = await fetch(`${base}${path}`, { method, headers, body: payload });
  const type = response.headers.get('content-type') || '';
  return {
    status: response.status,
    body: type.includes('json') ? await response.json() : await response.arrayBuffer(),
  };
}

async function main() {
  const health = await call('/health');
  assert.equal(health.status, 200);
  const admin = await call('/auth/login', {
    method: 'POST',
    body: { email: process.env.SEED_HRD_EMAIL, password: process.env.SEED_HRD_PASSWORD },
  });
  assert.equal(admin.status, 201, JSON.stringify(admin.body));
  const adminToken = admin.body.accessToken;
  assert.equal(admin.body.user.timezone, process.env.BUSINESS_TIMEZONE || 'Asia/Jakarta');
  const created = await call('/employees', {
    method: 'POST',
    token: adminToken,
    body: { email, password, employeeNumber, fullName: 'Smoke Test Employee', department: 'QA' },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  employeeId = created.body.id;
  const sortedEmployees = await call(
    `/employees?search=${employeeNumber}&sortBy=employeeNumber&order=DESC`,
    { token: adminToken },
  );
  assert.equal(sortedEmployees.status, 200);
  assert.equal(sortedEmployees.body.items[0].id, employeeId);
  const invalidEmployee = await call('/employees', {
    method: 'POST',
    token: adminToken,
    body: {
      email: `invalid-${marker}@example.test`,
      password,
      employeeNumber: `INVALID-${marker}`,
      fullName: '   ',
      department: ' IT ',
    },
  });
  assert.equal(invalidEmployee.status, 400);
  const duplicateEmployee = await call('/employees', {
    method: 'POST',
    token: adminToken,
    body: {
      email,
      password,
      employeeNumber: `OTHER-${marker}`,
      fullName: 'Duplicate',
      department: 'QA',
    },
  });
  assert.equal(duplicateEmployee.status, 409);
  assert.equal(duplicateEmployee.body.field, 'email');
  const employeeLogin = await call('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(employeeLogin.status, 201, JSON.stringify(employeeLogin.body));
  const employeeToken = employeeLogin.body.accessToken;
  const denied = await call('/employees', { token: employeeToken });
  assert.equal(denied.status, 403);
  assert.equal((await call('/dashboard/summary', { token: employeeToken })).status, 403);
  const dashboard = await call('/dashboard/summary', { token: adminToken });
  assert.equal(dashboard.status, 200, JSON.stringify(dashboard.body));
  assert.equal(dashboard.body.trend.length, 7);
  const before = await call('/attendance/check-out', {
    method: 'POST',
    token: employeeToken,
    photo: true,
  });
  assert.equal(before.status, 409, JSON.stringify(before.body));
  const checkIn = await call('/attendance/check-in', {
    method: 'POST',
    token: employeeToken,
    photo: true,
  });
  assert.equal(checkIn.status, 201, JSON.stringify(checkIn.body));
  assert.equal(checkIn.body.workedSeconds, null);
  assert.equal(checkIn.body.status, 'CHECKED_IN');
  const duplicate = await call('/attendance/check-in', {
    method: 'POST',
    token: employeeToken,
    photo: true,
  });
  assert.equal(duplicate.status, 409);
  const checkOut = await call('/attendance/check-out', {
    method: 'POST',
    token: employeeToken,
    photo: true,
  });
  assert.equal(checkOut.status, 201, JSON.stringify(checkOut.body));
  assert.equal(checkOut.body.status, 'COMPLETE');
  const elapsedSeconds = Math.floor(
    (Date.parse(checkOut.body.checkOutAt) - Date.parse(checkOut.body.checkInAt)) / 1000,
  );
  assert.equal(checkOut.body.workedSeconds, elapsedSeconds);
  const recapUrl = `/attendance/recap?dateFrom=${checkOut.body.workDate}&dateTo=${checkOut.body.workDate}&employeeId=${employeeId}`;
  const recap = await call(recapUrl, { token: adminToken });
  assert.equal(recap.status, 200, JSON.stringify(recap.body));
  assert.equal(recap.body.total, 1);
  assert.equal(recap.body.items[0].records[0].id, checkOut.body.id);
  assert.equal(recap.body.items[0].totalWorkedSeconds, elapsedSeconds);
  assert.equal((await call(recapUrl, { token: employeeToken })).status, 403);
  const pendingRecap = await call(`${recapUrl}&status=CHECKED_IN`, { token: adminToken });
  assert.equal(pendingRecap.body.total, 0);
  const filteredHistory = await call(
    `/attendance/me?dateFrom=${checkOut.body.workDate}&dateTo=${checkOut.body.workDate}&status=COMPLETE`,
    { token: employeeToken },
  );
  assert.equal(filteredHistory.body.total, 1);
  assert.equal(filteredHistory.body.summary.totalWorkedSeconds, elapsedSeconds);
  const updatedDashboard = await call('/dashboard/summary', { token: adminToken });
  assert.ok(updatedDashboard.body.today.total >= 1, 'Dashboard must include the new check-in');
  assert.ok(updatedDashboard.body.today.completed >= 1, 'Dashboard must include the new check-out');
  assert.equal(updatedDashboard.body.trend.at(-1).total, updatedDashboard.body.today.total);
  const duplicateOut = await call('/attendance/check-out', {
    method: 'POST',
    token: employeeToken,
    photo: true,
  });
  assert.equal(duplicateOut.status, 409);
  const photo = await call(`/files/attendance/${checkOut.body.id}/check-in`, {
    token: employeeToken,
  });
  assert.equal(photo.status, 200);
  const privatePhoto = await call(`/files/attendance/${checkOut.body.id}/check-in`);
  assert.equal(privatePhoto.status, 401);
  const monitoring = await call(`/attendance?employeeId=${employeeId}`, { token: adminToken });
  assert.equal(monitoring.status, 200);
  assert.equal(monitoring.body.total, 1);
  assert.equal(monitoring.body.summary.totalWorkedSeconds, elapsedSeconds);
  const fixture = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    for (const [day, hours] of [
      ['2000-01-01', 9],
      ['2000-01-02', 8],
    ]) {
      await fixture.query(
        'INSERT INTO attendances (id, employee_id, work_date, check_in_at, check_out_at, check_in_photo_key, check_out_photo_key) SELECT ?, employee_id, ?, ?, ?, check_in_photo_key, check_out_photo_key FROM attendances WHERE id = ?',
        [
          randomUUID(),
          day,
          `${day} 01:00:00`,
          `${day} ${String(1 + hours).padStart(2, '0')}:00:00`,
          checkOut.body.id,
        ],
      );
    }
  } finally {
    await fixture.end();
  }
  for (const [path, token] of [
    ['/attendance/me', employeeToken],
    [`/attendance?employeeId=${employeeId}`, adminToken],
  ]) {
    const result = await call(
      `${path}${path.includes('?') ? '&' : '?'}dateFrom=2000-01-01&dateTo=2000-01-02&limit=1`,
      { token },
    );
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.items.length, 1);
    assert.equal(result.body.total, 2);
    assert.equal(result.body.summary.totalWorkedSeconds, 61200);
    assert.equal(result.body.summary.completedRecords, 2);
  }
  const hoursRecap = await call(
    `/attendance/recap?employeeId=${employeeId}&dateFrom=2000-01-01&dateTo=2000-01-02`,
    { token: adminToken },
  );
  assert.equal(hoursRecap.body.items[0].totalWorkedSeconds, 61200);
  const pendingHours = await call(
    '/attendance/me?dateFrom=2000-01-01&dateTo=2000-01-02&status=CHECKED_IN',
    { token: employeeToken },
  );
  assert.equal(pendingHours.body.summary.totalWorkedSeconds, 0);
  const incompleteId = randomUUID();
  const incompleteDb = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await incompleteDb.query(
      'INSERT INTO attendances (id, employee_id, work_date, check_in_at, check_in_photo_key) SELECT ?, employee_id, ?, ?, check_in_photo_key FROM attendances WHERE id = ?',
      [incompleteId, '2000-01-03', '2000-01-03 01:00:00', checkOut.body.id],
    );
  } finally {
    await incompleteDb.end();
  }
  const incomplete = await call(`/attendance/${incompleteId}`, { token: employeeToken });
  assert.equal(incomplete.body.status, 'INCOMPLETE');
  assert.equal(incomplete.body.checkOutAt, null);
  assert.equal(incomplete.body.workedSeconds, null);
  for (const [path, token] of [
    ['/attendance/me', employeeToken],
    [`/attendance?employeeId=${employeeId}`, adminToken],
  ]) {
    const separator = path.includes('?') ? '&' : '?';
    const result = await call(`${path}${separator}dateFrom=2000-01-01&dateTo=2000-01-03`, {
      token,
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.summary.totalWorkedSeconds, 61200);
    assert.equal(result.body.summary.incompleteRecords, 1);
    assert.equal(result.body.summary.workingRecords, 0);
    const working = await call(
      `${path}${separator}dateFrom=2000-01-01&dateTo=2000-01-03&status=CHECKED_IN`,
      { token },
    );
    assert.equal(working.body.total, 0);
    const expired = await call(
      `${path}${separator}dateFrom=2000-01-01&dateTo=2000-01-03&status=INCOMPLETE`,
      { token },
    );
    assert.equal(expired.body.total, 1);
    assert.equal(expired.body.items[0].id, incompleteId);
  }
  const incompleteRecap = await call(
    `/attendance/recap?employeeId=${employeeId}&dateFrom=2000-01-01&dateTo=2000-01-03&status=INCOMPLETE`,
    { token: adminToken },
  );
  assert.equal(incompleteRecap.body.total, 1);
  assert.equal(incompleteRecap.body.items[0].records.length, 1);
  assert.equal(incompleteRecap.body.items[0].records[0].status, 'INCOMPLETE');
  assert.equal(incompleteRecap.body.items[0].totalWorkedSeconds, 0);
  const oldWorking = await call(
    `/attendance/recap?employeeId=${employeeId}&dateFrom=2000-01-01&dateTo=2000-01-03&status=CHECKED_IN`,
    { token: adminToken },
  );
  assert.equal(oldWorking.body.total, 0);
  const status = await call(`/employees/${employeeId}`, {
    method: 'DELETE',
    token: adminToken,
  });
  assert.equal(status.status, 200);
  const disabledLogin = await call('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(disabledLogin.status, 401);
  const activated = await call(`/employees/${employeeId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { isActive: true },
  });
  assert.equal(activated.status, 200);
  assert.equal(
    (await call('/auth/login', { method: 'POST', body: { email, password } })).status,
    201,
  );
  process.stdout.write(
    'Smoke test passed: auth, roles, employee, attendance, photo, monitoring, deactivation.\n',
  );
}

async function cleanup() {
  if (!employeeId) return;
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const [rows] = await connection.query(
      'SELECT check_in_photo_key, check_out_photo_key FROM attendances WHERE employee_id = ?',
      [employeeId],
    );
    await connection.query(
      'DELETE FROM audit_logs WHERE entity_type = ? AND entity_id IN (SELECT id FROM attendances WHERE employee_id = ?)',
      ['ATTENDANCE', employeeId],
    );
    await connection.query('DELETE FROM audit_logs WHERE entity_type = ? AND entity_id = ?', [
      'EMPLOYEE',
      employeeId,
    ]);
    await connection.query('DELETE FROM attendances WHERE employee_id = ?', [employeeId]);
    const [users] = await connection.query('SELECT user_id FROM employees WHERE id = ?', [
      employeeId,
    ]);
    await connection.query('DELETE FROM employees WHERE id = ?', [employeeId]);
    if (users.length) await connection.query('DELETE FROM users WHERE id = ?', [users[0].user_id]);
    for (const row of rows) {
      for (const key of [row.check_in_photo_key, row.check_out_photo_key]) {
        if (key)
          await unlink(resolve(process.env.UPLOAD_DIR || 'storage', key)).catch(() => undefined);
      }
    }
  } finally {
    await connection.end();
  }
}

try {
  await main();
} finally {
  await cleanup();
}
