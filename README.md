# Dexa Group - WFH Attendance

A web application for employee WFH check-in/check-out and HR attendance monitoring. Employees submit proof photos and review their own work hours. HR admins manage employee accounts, view dashboard charts, and monitor attendance through daily lists and employee/date recaps.

The interface is in English. The backend is a modular NestJS application, and the frontend is a React SPA. Both projects live in this repository and run as separate processes. Docker is not required.

## Documentation

| Document                                                   | Contents                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [README.md](./README.md)                                   | System overview and complete local setup, backend first                                 |
| [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) | Architecture, libraries, database, API contracts, validation, security, logs, and tests |
| [FEATURES_AND_WORKFLOWS.md](./FEATURES_AND_WORKFLOWS.md)   | Roles, features, attendance rules, screen flows, and demo scenarios                     |

## Repository structure

```text
dexa-presensi/
  README.md
  TECHNICAL_DOCUMENTATION.md
  FEATURES_AND_WORKFLOWS.md
  dexa-presensi-api/       NestJS backend, migrations, seed, and tests
  dexa-presensi-fe/        React frontend
```

There is no root npm workspace or root start command. Install dependencies and run commands inside each application folder. Commands below assume a fresh checkout and use PowerShell; equivalent macOS/Linux copy commands are included.

## 1. Prepare Node.js and MySQL

- Node.js **22.12+ within 22.x**, or **24.x**, with npm. Development was verified with Node.js 24.15.0 and npm 11.12.1.
- MySQL 8, running locally. Laragon, MySQL Workbench, HeidiSQL, or the MySQL CLI can be used to manage it.
- Two terminals: one for the API and one for the frontend.

From the repository root, confirm the tools are available:

```powershell
node --version
npm --version
```

## 2. Install and configure the backend

In terminal 1, starting from the repository root:

```powershell
cd dexa-presensi-api
npm ci
Copy-Item .env.example .env
```

On macOS/Linux, replace the last command with `cp .env.example .env`. Copy the example only during initial setup; do not overwrite an existing configured `.env`.

Edit `dexa-presensi-api/.env`:

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

Set the database connection to your local MySQL configuration. Replace `JWT_SECRET` with a random secret of at least 32 characters. Generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `.env`. Demo passwords are intentionally simple for evaluation; use separate credentials for a real deployment. Never commit `.env`.

## 3. Create the database

Start MySQL, connect using your preferred MySQL client, and execute:

```sql
CREATE DATABASE IF NOT EXISTS dexa_presensi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The database name must match `DB_NAME`. The configured user needs permission to create tables and read/write application data.

## 4. Apply migrations and create demo accounts

Still in `dexa-presensi-api`:

```powershell
npm run migration:run
npm run seed
```

On a fresh database, this creates 1 HR admin and 10 employees, with linked login accounts:

| Role     | Email                                                         | Default password |
| -------- | ------------------------------------------------------------- | ---------------- |
| HR admin | `hrd@example.test`                                            | `password`       |
| Employee | `employee001@example.test` through `employee010@example.test` | `password`       |

Seed variables can override these credentials. **Rerunning the seed does not reset existing passwords, reactivate accounts, or overwrite employee details.** If an account already existed, use its actual password. Changing `SEED_HRD_PASSWORD` in `.env` alone does not change a database account's password.

The seed creates accounts and employee profiles, not attendance or photos. Empty charts on a new installation are expected.

## 5. Start and check the backend

```powershell
npm run start:dev
```

Keep terminal 1 running. Open:

- Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health), expected response `{"status":"ok"}`.
- Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs).
- OpenAPI JSON: [http://localhost:3000/api/docs-json](http://localhost:3000/api/docs-json).

API URLs use `/api`, without `/v1`. The health endpoint checks process liveness; it is not a separate database-readiness probe.

## 6. Install and configure the frontend

In terminal 2, starting from the repository root:

```powershell
cd dexa-presensi-fe
npm ci
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env`. The frontend environment contains:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

Keep `/api` in the URL. If the backend port changes, update this address. Values prefixed with `VITE_` are public browser configuration; never place database credentials or the JWT secret here.

## 7. Start the frontend and log in

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and use a demo account:

- HR admin lands on `/hrd`.
- Employee lands on `/employee`.

Keep MySQL and both terminals running. The backend `FRONTEND_ORIGIN` must match the frontend's exact browser origin. If Vite selects another port, free port 5173 or update the backend origin and restart the API. Restart Vite after changing its `.env`.

For a quick demonstration: log in as an employee, check in and check out with photos, then log in as HR admin to inspect the same record in monitoring. See [feature workflows](./FEATURES_AND_WORKFLOWS.md) for detailed scenarios.

## Running again after initial setup

Start MySQL, then run the following in separate terminals from the repository root:

```powershell
# Terminal 1
cd dexa-presensi-api
npm run start:dev
```

```powershell
# Terminal 2
cd dexa-presensi-fe
npm run dev
```

Run migrations when new migration files are introduced. Reinstall with `npm ci` after lockfile changes. Reseeding is optional and preserves existing accounts.

## Build and verify

From `dexa-presensi-api`:

```powershell
npm run build
npm test -- --runInBand
npm run lint
npm run format:check
```

From `dexa-presensi-fe`:

```powershell
npm run build
npm test
npm run format:check
```

To use compiled output, replace the backend watch process with `npm run start` after building. Replace the frontend dev process with `npm run preview -- --port 5173` after building. Stop the existing processes before reusing their ports. Keep MySQL running. Vite preview is for local review, not a production hosting server.

HTTP smoke and regression test prerequisites are explained in [technical documentation](./TECHNICAL_DOCUMENTATION.md#testing-and-quality-checks).

## Troubleshooting

| Symptom                          | Resolution                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| MySQL connection refused         | Start MySQL and verify `DB_HOST` and `DB_PORT`.                                                   |
| Access denied / unknown database | Check MySQL credentials, permissions, and `DB_NAME`; create the database.                         |
| Table not found                  | Run backend migrations before seeding or starting the application.                                |
| Login returns 401                | Check the actual account password and activation state. Seed does not reset an existing password. |
| Login returns 429                | The login rate limit was reached; wait for the limit window to expire.                            |
| Frontend cannot reach the API    | Verify the health URL, `VITE_API_BASE_URL`, and whether the API is running.                       |
| CORS error                       | Match `FRONTEND_ORIGIN` to the exact frontend origin, including port, then restart the API.       |
| Invalid timezone during startup  | Use a supported timezone such as `Asia/Jakarta` or `UTC`.                                         |
| Empty charts or attendance       | New demo accounts have no attendance. Submit check-in/check-out and review filters.               |
| Photo upload rejected            | Use a static JPEG/PNG/WebP within the default 5 MB limit and supported dimensions.                |
| Port already in use              | Stop the conflicting process or consistently change the API/frontend port configuration.          |

## Repository contents for delivery

Commit source, migrations, seed, lockfiles, `.env.example`, and documentation. Application `.gitignore` files exclude `.env`, dependencies, build output, and backend photo storage. Review staged files before pushing. No GitHub push or deployment is performed by following this guide.
