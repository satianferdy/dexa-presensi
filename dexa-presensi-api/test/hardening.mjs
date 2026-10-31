import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Requires a built API, migrated development database, and seeded demo accounts.
const port = process.env.TEST_PORT || '3001';
const base = `http://127.0.0.1:${port}/api`;
let server;
let logs = '';

async function start() {
  logs = '';
  server = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (data) => (logs += data));
  server.stderr.on('data', (data) => (logs += data));
  for (let attempt = 0; attempt < 150; attempt++) {
    if (server.exitCode !== null) throw new Error(`QA server exited: ${logs}`);
    // Wait for this child to listen, rather than accidentally using an existing server.
    if (logs.includes('Nest application successfully started')) {
      const health = await fetch(`${base}/health`);
      assert.equal(health.status, 200);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`QA server startup timed out: ${logs}`);
}

async function stop() {
  const child = server;
  server = undefined;
  if (child && child.exitCode === null && child.signalCode === null) {
    const done = once(child, 'exit');
    child.kill();
    await done;
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    id: response.headers.get('x-request-id'),
    body: await response.json(),
  };
}

try {
  await start();
  const smoke = spawn(process.execPath, ['test/smoke.mjs'], {
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  smoke.stdout.on('data', (data) => (output += data));
  smoke.stderr.on('data', (data) => (output += data));
  const [code] = await once(smoke, 'exit');
  assert.equal(code, 0, output);
  console.log('PASS: existing HTTP smoke suite.');
  await stop();
  await start();

  const admin = await call('/auth/login', {
    method: 'POST',
    body: { email: process.env.SEED_HRD_EMAIL, password: process.env.SEED_HRD_PASSWORD },
  });
  assert.equal(admin.status, 201);
  const token = admin.body.accessToken;
  const employee = await call('/auth/login', {
    method: 'POST',
    body: {
      email: 'employee001@example.test',
      password: process.env.SEED_EMPLOYEE_PASSWORD ?? 'password',
    },
  });
  assert.equal(employee.status, 201);
  const checks = [];
  checks.push(await call('/employees'));
  assert.equal(checks.at(-1).status, 401);
  checks.push(await call('/employees', { token: employee.body.accessToken }));
  assert.equal(checks.at(-1).status, 403);
  for (const path of [
    '/employees/not-a-uuid',
    '/attendance/not-a-uuid',
    '/files/attendance/not-a-uuid/check-in',
  ]) {
    checks.push(await call(path, { token }));
    assert.equal(checks.at(-1).status, 400);
  }

  for (const endpoint of [
    '/attendance',
    '/attendance/me',
    '/attendance/recap',
    '/dashboard/summary',
  ]) {
    const roleToken = endpoint === '/attendance/me' ? employee.body.accessToken : token;
    for (const query of [
      'dateFrom=2026-02-30&dateTo=2026-03-01',
      'dateFrom=2026-11-01&dateTo=2026-10-31',
      'dateFrom=2026-10-31T00%3A00%3A00Z',
    ]) {
      const result = await call(`${endpoint}?${query}`, { token: roleToken });
      assert.equal(result.status, 400, `${endpoint}: ${JSON.stringify(result.body)}`);
    }
  }

  const list = await call('/employees?search=DEMO-001', { token });
  assert.equal(list.status, 200);
  const id = list.body.items.find((item) => item.employeeNumber === 'DEMO-001').id;
  for (const field of ['email', 'employeeNumber', 'fullName', 'department', 'position', 'phone']) {
    checks.push(
      await call(`/employees/${id}`, { method: 'PATCH', token, body: { [field]: null } }),
    );
    assert.equal(checks.at(-1).status, 400);
  }
  const summary = await call('/dashboard/summary?dateFrom=2026-10-30&dateTo=2026-10-31', { token });
  assert.equal(summary.status, 200);
  assert.equal(summary.body.trend.length, 2);

  const schema = await (await fetch(`${base}/docs-json`)).json();
  let operations = 0;
  for (const [path, methods] of Object.entries(schema.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!['get', 'post', 'patch', 'delete'].includes(method)) continue;
      operations++;
      assert.ok(
        operation.responses[method === 'post' ? '201' : '200']?.content,
        `Missing success schema: ${method} ${path}`,
      );
      assert.ok(operation.responses['429']?.content, `Missing error schema: ${path}`);
      if (['post', 'patch'].includes(method))
        assert.ok(operation.requestBody?.content, `Missing request schema: ${path}`);
    }
  }
  assert.equal(schema.components.schemas.CreateEmployeeDto.properties.password.writeOnly, true);
  assert.equal(schema.components.schemas.UpdateEmployeeDto.required, undefined);
  assert.ok(schema.components.schemas.AttendanceResponseDto.properties.checkInAt);
  assert.notEqual(schema.components.schemas.ErrorResponseDto.properties.message.type, 'object');
  assert.ok(
    schema.paths['/api/attendance/recap'].get.parameters.some((param) => param.name === 'dateFrom'),
  );
  console.log(`PASS: OpenAPI request, success, and error schemas for ${operations} operations.`);

  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await call('/auth/login', {
      method: 'POST',
      body: { email: 'missing@example.test', password: 'incorrect' },
    });
    checks.push(result);
    if (result.status === 429) break;
  }
  assert.ok(checks.some((result) => result.status === 429));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const access = logs.split('\n').flatMap((line) => {
    try {
      const value = JSON.parse(line);
      return value.context === 'HTTP' ? [value] : [];
    } catch {
      return [];
    }
  });
  for (const check of checks) {
    const matches = access.filter((line) => line.requestId === check.id);
    assert.equal(matches.length, 1, `Missing/duplicate access log for ${check.status}`);
    assert.equal(matches[0].status, check.status);
  }
  console.log(
    'PASS: UUID, null, calendar/range validation and exactly one access log for HTTP 400/401/403/429.',
  );
  await stop();

  const invalid = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, PORT: port, BUSINESS_TIMEZONE: 'Mars/Unknown' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let invalidOutput = '';
  invalid.stdout.on('data', (data) => (invalidOutput += data));
  invalid.stderr.on('data', (data) => (invalidOutput += data));
  const [invalidCode] = await once(invalid, 'exit');
  assert.notEqual(invalidCode, 0);
  assert.ok(invalidOutput.includes('BUSINESS_TIMEZONE'));
  console.log('PASS: invalid business timezone fails at startup.');
} finally {
  await stop();
}
