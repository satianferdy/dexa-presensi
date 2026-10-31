# Dexa Group — WFH Attendance Frontend

React + TypeScript application for employees and HR admins, with an English interface and Dexa red theme. Connects to the NestJS backend through `/api`.

## 1. Prerequisites

- Node.js 22.12 or newer in the 22.x release line, and npm.
- Backend and MySQL configured using the backend README.
- Run all commands below from the frontend repository root.

## 2. Start the backend first

In a separate terminal, from the backend repository:

```bash
npm ci
npm run migration:run
npm run seed
npm run start:dev
```

These commands assume the backend `.env` and MySQL database already exist. Follow the backend README for the full setup. Verify [http://localhost:3000/api/health](http://localhost:3000/api/health) returns `{"status":"ok"}`. Leave that terminal running.

## 3. Install and configure the frontend

```bash
npm ci
```

In PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env`. The default configuration is:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

Include `/api` without `/v1`. If the backend port changes, update this value and restart Vite. `VITE_` values are exposed to the browser: never put database credentials or JWT secrets here. `.env` is ignored by Git.

## 4. Start the frontend

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Keep both terminals running and MySQL active.

Backend `FRONTEND_ORIGIN` must match this origin. If Vite selects another port because 5173 is busy, stop the conflicting process or update the backend origin and restart it.

## 5. Log in with demo accounts

After seeding a fresh backend database:

| Role     | Email                      | Default password | Landing page |
| -------- | -------------------------- | ---------------- | ------------ |
| HR admin | `hrd@example.test`         | `password`       | `/hrd`       |
| Employee | `employee001@example.test` | `password`       | `/employee`  |

There are 10 employee logins, `employee001@example.test` through `employee010@example.test`, all with default password `password`. Backend seed variables can override these defaults. Rerunning the seed preserves existing passwords and activation states.

## 6. Try the application

1. Log in as an employee. Review today's status, working-time targets, profile, and previous incomplete attendance notice if applicable.
2. Select **Check in**, choose a JPEG/PNG/WebP photo (up to 5 MB by default), optionally add a note, and submit. Verify the server-confirmed time.
3. Use **Check out** with a proof upload. Review attendance history and open the photo viewer.
4. Log out and log in as HR admin. Review overview charts, the employee list, and attendance monitoring.
5. Switch monitoring between **Recap** and **List**, use monthly/date-range filtering, and inspect read-only attendance details.
6. Add/edit an employee or deactivate/reactivate a demo employee. Deactivation retains history.

Freshly seeded accounts have no attendance or proof photos. Empty charts/cells are expected until employees submit attendance. An empty recap cell does not imply absence or leave.

## Pages

Attendance status distinguishes **Working** (today's check-in awaiting check-out), **Incomplete** (a prior business date with no check-out), and **Completed**. HR monitoring has an Incomplete filter and Recap badge `I`. Employee history counts Working and Incomplete separately. Attendance queries refresh when the configured business date changes so an open screen does not retain yesterday's Working label. No automatic check-out or estimated final hours are generated.

Employees can see **Total work time** on their dashboard, on each history entry, and on attendance details. History includes accumulated time over all records matching the date filter, across pages. HR monitoring shows work time in List rows and daily Recap cells, with selected-period totals per employee in Recap and an overall filtered total in List. Choose a single employee to see their accumulated List total.

Work time is calculated by the API from server check-in/check-out timestamps, without deducting breaks. Pending check-outs display a dash and are excluded from completed totals. A full 08:00–17:00 record displays `9h 00m`; multi-day totals can exceed 24 hours. Time is shown to minute precision (`<1m` for a completed record below one minute).

| Route                   | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `/login`                | Shared employee / HR login                                        |
| `/employee`             | Today, check-in/check-out, profile, incomplete attendance notices |
| `/employee/history`     | Own attendance history                                            |
| `/employee/history/:id` | Own attendance detail and photos                                  |
| `/hrd`                  | HR overview and attendance charts                                 |
| `/hrd/employees`        | Search, filter, and manage employees                              |
| `/hrd/employees/new`    | Add an employee                                                   |
| `/hrd/employees/:id`    | Edit an employee                                                  |
| `/hrd/attendance`       | Monitoring with Recap / List views                                |
| `/hrd/attendance/:id`   | Read-only attendance detail                                       |

Recap supports up to 62 days and paginates employees, with sticky employee/date headers. Dashboard summaries use one backend endpoint. Times use the business timezone returned by the backend (default `Asia/Jakarta`, WIB). The business date refreshes at midnight and when the tab regains focus.

## Build and preview

```bash
npm run build
npm run preview -- --port 5173
```

Stop the development frontend before using the same port for preview. The backend must remain running. Preview serves `dist/` for local review. The API URL is embedded at build time; rebuild after changing it.

For hosting, configure the web server to serve `index.html` for client-side routes such as `/hrd/attendance`, so direct links and refreshes work. Set backend CORS to the deployed frontend origin.

## Commands and verification

| Command                          | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `npm run dev`                    | Vite development server                         |
| `npm run build`                  | TypeScript checks and production build          |
| `npm run preview -- --port 5173` | Preview the compiled application                |
| `npm test`                       | Date/timezone unit tests with Vitest in Node.js |
| `npm run format`                 | Format with Prettier                            |
| `npm run format:check`           | Check formatting                                |

Also check UI flows in a browser: responsive layout, photo upload/preview/removal, attendance actions, filters, validation, and keyboard navigation. Automated frontend tests currently cover date/timezone calculations rather than browser interactions.

## Libraries and structure

- React Router: navigation and role-protected pages.
- TanStack Query + Axios: requests, cache, request states, and session expiry.
- React Hook Form + Zod: employee form validation and server field errors.
- date-fns + date-fns-tz: dates and timezone formatting.
- Lucide React: icons; Tailwind CSS/shared CSS: styles; Prettier: formatting.
- `src/pages/`: route screens; `src/features/`: attendance/monitoring; `src/components/`: shared UI/layout; `src/lib/`: API, types, and date helpers; `src/state/`: authentication.

Tokens live in `sessionStorage`; log in again after expiry. Photos are retrieved as authenticated blobs and displayed using object URLs. See [ARCHITECTURE.md](./ARCHITECTURE.md) for design details.

## Troubleshooting

| Problem                | What to check                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Cannot connect to API  | Verify the health URL and `VITE_API_BASE_URL`; restart Vite after changes.              |
| CORS error             | Match backend `FRONTEND_ORIGIN` to the browser origin and restart the API.              |
| Demo login fails       | Run the seed; check backend seed overrides, existing passwords, and account activation. |
| Returned to login      | The token may have expired or the account may be inactive.                              |
| Empty attendance/chart | The seed creates accounts, not attendance; check in/out and review filters.             |
| Build engine warning   | Use the documented Node version and reinstall with `npm ci`.                            |

## Before pushing to GitHub

Commit source, documentation, `.env.example`, and `package-lock.json`. `.gitignore` excludes `.env`, `node_modules/`, and `dist/`. Keep backend secrets out of frontend configuration.
