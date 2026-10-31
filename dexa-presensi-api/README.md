# Dexa Group — WFH Attendance API

NestJS + TypeScript backend for employee WFH attendance and HR administration. Uses MySQL, TypeORM migrations, JWT authentication, role-based access, private photos, and transactional audit logs. All routes use `/api` without `/v1`. Docker is not required.

## 1. Prerequisites

- Node.js 22.12 or newer in the 22.x release line, and npm. Use the same Node version for both repositories.
- MySQL 8 running locally (for example through Laragon).
- Run all commands from the backend repository root.

## 2. Install dependencies

```bash
npm ci
```

This installs the versions committed in `package-lock.json`.

## 3. Configure the environment

In PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env`. Edit `.env` to match your MySQL connection:

```dotenv
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=dexa_presensi
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
JWT_EXPIRES_IN_SECONDS=3600
BUSINESS_TIMEZONE=Asia/Jakarta
UPLOAD_DIR=storage
MAX_UPLOAD_BYTES=5242880
SEED_HRD_EMAIL=hrd@example.test
SEED_HRD_PASSWORD=password
SEED_EMPLOYEE_PASSWORD=password
```

Replace `JWT_SECRET` with a random value of at least 32 characters. Generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`.env` is ignored by Git. The simple seed passwords are intended for this technical-test demo; use separate credentials for a real deployment.

## 4. Create the MySQL database

Run in your MySQL client (HeidiSQL, MySQL Workbench, or the MySQL CLI):

```sql
CREATE DATABASE IF NOT EXISTS dexa_presensi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The name must match `DB_NAME`. The configured MySQL user needs permission to create tables and read/write data in this database.

## 5. Run migrations and seed

```bash
npm run migration:run
npm run seed
```

On a fresh database, the seed creates **1 HR admin and 10 employees**, each with a linked login account. Passwords are stored as Argon2 hashes.

| Role     | Email                                                         | Default password |
| -------- | ------------------------------------------------------------- | ---------------- |
| HR admin | `hrd@example.test`                                            | `password`       |
| Employee | `employee001@example.test` through `employee010@example.test` | `password`       |

Override admin credentials with `SEED_HRD_EMAIL` / `SEED_HRD_PASSWORD`, and employee passwords with `SEED_EMPLOYEE_PASSWORD`.

| Employee ID | Name            | Department               | Position             |
| ----------- | --------------- | ------------------------ | -------------------- |
| DEMO-001    | Andi Pratama    | Information Technology   | Frontend Developer   |
| DEMO-002    | Budi Santoso    | Information Technology   | Backend Developer    |
| DEMO-003    | Citra Lestari   | Human Resources          | HR Officer           |
| DEMO-004    | Dewi Anggraini  | Finance                  | Accountant           |
| DEMO-005    | Eko Saputra     | Operations               | Operations Staff     |
| DEMO-006    | Fitri Handayani | Marketing                | Marketing Specialist |
| DEMO-007    | Gilang Ramadhan | Sales                    | Sales Executive      |
| DEMO-008    | Hana Maharani   | Quality Assurance        | QA Analyst           |
| DEMO-009    | Indra Wijaya    | Research and Development | Research Associate   |
| DEMO-010    | Jihan Putri     | Procurement              | Procurement Staff    |

Email numbering matches employee numbering: DEMO-001 uses `employee001@example.test`.

**Rerunning the seed preserves existing passwords, activation states, employee details, and attendance.** Only missing demo accounts/profiles are inserted. Changing a seed password in `.env` does not reset an existing password. Conflicting email/employee ownership causes the transaction to roll back. Run only one seed process at a time. Existing users are retained, so a populated database may contain more than 11 accounts.

The seed does not generate attendance or proof photos. Charts populate after employees check in/out.

## 6. Start the API

```bash
npm run start:dev
```

Keep this terminal running, then open:

- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

The health response should be `{"status":"ok"}`. Start the frontend in another terminal using its README.

In Swagger, call `POST /api/auth/login`:

```json
{ "email": "hrd@example.test", "password": "password" }
```

Copy `accessToken` from the response into Swagger's **Authorize** dialog. Protected requests use `Authorization: Bearer <accessToken>`. Tokens expire after 3,600 seconds by default; log in again after expiry.

## 7. Build and run compiled code

```bash
npm run build
npm run start
```

Use this instead of the watch server on the configured port. Run migrations before starting against a new database. Keep `.env`, MySQL, and a writable upload directory available.

## Commands and verification

| Command                    | Purpose                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `npm run start:dev`        | Development server with watch mode                                                    |
| `npm run build`            | Compile the application                                                               |
| `npm run start`            | Start `dist/main.js`                                                                  |
| `npm run migration:run`    | Apply pending migrations through TypeORM's bundled CLI                                |
| `npm run migration:revert` | Undo the latest migration; use only on a disposable database                          |
| `npm run seed`             | Insert missing demo admin and employees                                               |
| `npm test -- --runInBand`  | Unit tests for attendance rules, DTOs, and photo validation                           |
| `npm run test:smoke`       | HTTP integration checks against a running local API and MySQL                         |
| `npm run test:hardening`   | Built-API smoke/regression checks, guard access logs, validation, and OpenAPI schemas |
| `npm run lint`             | ESLint                                                                                |
| `npm run format`           | Apply Prettier                                                                        |
| `npm run format:check`     | Check formatting                                                                      |

For smoke tests, keep the API running and set `SEED_HRD_EMAIL` / `SEED_HRD_PASSWORD` in `.env` to credentials that actually work in your database. Tests create temporary data, exercise roles, employee management, attendance, photos, dashboard, and recap, then remove their temporary records/files. Use a development database.

For `test:hardening`, first run `npm run build` and seed the development database. This script starts and stops its own API on port 3001 (override with `TEST_PORT`), runs the smoke suite, and checks invalid inputs, Swagger schemas, startup timezone validation, and guard access logs. It expects the seeded `employee001@example.test` account to be active with `SEED_EMPLOYEE_PASSWORD` (default `password`), and valid HR credentials in `.env`. The API on port 3000 is left running.

## Main endpoints

| Method     | Path                              | Access                                    |
| ---------- | --------------------------------- | ----------------------------------------- |
| POST       | `/api/auth/login`                 | Public                                    |
| GET        | `/api/auth/me`                    | Authenticated user                        |
| GET        | `/api/dashboard/summary`          | HR admin; summary/trends, 1–31 days       |
| GET, POST  | `/api/employees`                  | HR admin                                  |
| GET, PATCH | `/api/employees/:id`              | HR admin                                  |
| PATCH      | `/api/employees/:id/status`       | HR admin; activate/deactivate             |
| DELETE     | `/api/employees/:id`              | HR admin; deactivate, retaining history   |
| GET        | `/api/attendance/today`           | Employee                                  |
| POST       | `/api/attendance/check-in`        | Employee                                  |
| POST       | `/api/attendance/check-out`       | Employee                                  |
| GET        | `/api/attendance/me`              | Employee; own history                     |
| GET        | `/api/attendance`                 | HR admin                                  |
| GET        | `/api/attendance/recap`           | HR admin; employee/date matrix, 1–62 days |
| GET        | `/api/attendance/:id`             | HR admin or record owner                  |
| GET        | `/api/files/attendance/:id/:kind` | HR admin or record owner                  |

Attendance actions accept `multipart/form-data`: required `photo` (JPEG/PNG/WebP; default maximum 5 MB) and optional `note`. Sharp decodes and re-encodes photos before private storage. Photo requests require authentication; the frontend retrieves blobs rather than putting tokens in image URLs.

## Rules and architecture

### Work duration

Unclosed attendance is `CHECKED_IN` (Working) on its business date and automatically becomes `INCOMPLETE` when that date has passed in `BUSINESS_TIMEZONE`. This status is derived when reading records, without a scheduled job or invented check-out time. Completed records remain `COMPLETE`. List and Recap filters support `INCOMPLETE`; history summaries separate `workingRecords` from prior-day `incompleteRecords`. Both unclosed states remain excluded from worked-hour totals. Employees can check in on a new day even if a previous record is incomplete; overnight checkout remains unsupported.

Attendance responses include `workedSeconds`: whole elapsed seconds from server check-in to check-out, or `null` until checkout. No break deduction, daily cap, or overtime classification is applied. For example, 08:00–17:00 equals 32,400 seconds (9 hours). The value is computed from existing timestamps; no database migration is required.

Employee history and HR attendance list responses include `summary` with `totalWorkedSeconds`, `completedRecords`, and `incompleteRecords` across **all matching results before pagination**, respecting dates, employee access, and status filters. Incomplete records contribute zero to totals. Recap includes `totalWorkedSeconds` per employee for the selected dates/status. The frontend formats these values as hours/minutes, retaining totals above 24 hours. Values below one minute display as `<1m`.

- One check-in/check-out pair per employee per business date, protected by transactions and database constraints.
- Server timestamps are authoritative and stored in UTC. `BUSINESS_TIMEZONE` determines work dates and the display timezone supplied to the frontend.
- Working-time targets: 08:00 check-in and 17:00 check-out. Late arrival / early departure is flagged rather than blocked.
- Check-out requires a same-day check-in. Previous incomplete records remain visible; overnight shifts are not supported.
- Photos are required for both actions; gallery selection is supported.
- HR admins manage employees and view attendance. Employees access only their own records/photos.
- Deactivation preserves history and blocks protected requests, including previously issued tokens.
- Modular monolith: `auth`, `employees`, `attendance`, `files`, `dashboard`, and `audit` modules.
- JSON operational logs go to stdout. Audit records share the business-change transaction. Passwords, tokens, and photo content are excluded from logs.

### Request validation and access logs

Update fields may be omitted, but explicit `null` values are rejected with HTTP 400. To clear an optional employee position or phone number, send an empty string. Record IDs in route parameters must be UUID v4. Date filters accept real calendar dates in `YYYY-MM-DD` format, and the end date cannot precede the start date. The business timezone is validated at startup; invalid timezone names stop the application before it starts serving requests.

Access logging runs in middleware before guards and writes once when a response finishes or the connection closes. This includes guard rejections (401/403/429). Successful requests use `info`, client errors use `warn`, and server errors use `error`. A connection closed before the response finishes is logged with synthetic status 499 and `aborted: true`. Logs contain the request ID, method, route, final status, and duration, without request bodies, query strings, or authorization headers.

Swagger at `/api/docs` documents request DTOs, response schemas, pagination, bearer authentication, multipart photos, and standard errors. The machine-readable OpenAPI document is available at `/api/docs-json`. The Nest Swagger compiler plugin derives request field constraints from DTOs; run `npm run build` or restart `npm run start:dev` after changing compiler configuration.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [BACKEND_IMPLEMENTATION_PLAN.md](./BACKEND_IMPLEMENTATION_PLAN.md) for design details. This README describes the current run procedure.

## Troubleshooting

| Problem                                  | What to check                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| MySQL connection refused / access denied | Start MySQL and check host, port, credentials, and permissions.                            |
| Unknown database / table missing         | Create the configured database and run migrations.                                         |
| Login fails after seeding                | Check environment overrides; existing passwords and inactive states are preserved.         |
| CORS error                               | Match `FRONTEND_ORIGIN` to the exact frontend origin, including port, and restart the API. |
| Port already in use                      | Stop the conflicting process or change `PORT` and the frontend API URL.                    |
| Upload cannot be saved                   | Check upload-directory permissions, supported format, and file size.                       |

## Before pushing to GitHub

Commit source, documentation, `.env.example`, and `package-lock.json`. `.gitignore` excludes `.env`, `node_modules/`, `dist/`, `storage/`, coverage, and temporary QA fixtures. Review staged files for local credentials and photos. Production deployment also needs HTTPS, secret management, durable private storage, backups, and log retention.
