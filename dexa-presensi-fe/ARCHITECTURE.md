# Dexa Presensi WFH — Frontend Architecture and UI/UX Plan

Status: implementation plan, 28 October 2026. Backend contract and data rules: `../dexa-presensi-api/ARCHITECTURE.md`.

The tree below is a target structure. The current implementation separates routing in `src/app.tsx`, screens in `src/pages/`, shared controls in `src/components/ui/`, layout in `src/components/layout/`, and attendance-specific components in `src/features/attendance/`. Authentication lives in `src/state/auth.tsx`; the shared HTTP client, models, and date helpers live in `src/lib/`. Employee forms use React Hook Form and Zod with field-level server errors and unsaved-change protection. Login uses native validation. Shared modal focus handling and date-range controls live in `src/components/ui/`. Business timezone comes from the authenticated backend user response.

## 1. Product scope

Build one responsive React web app with two role-based experiences. Employees log in, check in and check out for WFH, attach photos from gallery or camera, and see their own attendance. HRD logs in, manages employee master data, and **only views** attendance. Work targets are 08:00 check-in and 17:00 check-out. The browser must not decide official timestamps; the backend does.

Recruiter confirmed check-in/check-out, gallery upload, working hours, and clean code separation by module. Photo requirement per action, business timezone, and blocking policy for early/late actions remain unconfirmed. UI defaults match the backend plan: photo at both actions, `Asia/Jakarta`, and show timing flags without blocking submission.

## 2. Stack and rationale

| Area         | Choice                       | Use                                                                 |
| ------------ | ---------------------------- | ------------------------------------------------------------------- |
| App          | React + TypeScript + Vite    | Fast SPA development and typed API models                           |
| Routing      | React Router                 | Public/protected routes and role layout                             |
| Server state | TanStack Query               | Fetch/cache/refetch, loading and mutation state                     |
| HTTP         | Axios instance               | One base URL, auth header, error handling                           |
| Forms        | React Hook Form + Zod        | Employee form/login validation                                      |
| Styling      | Tailwind CSS                 | Responsive layout within test deadline                              |
| Icons        | Lucide React                 | Consistent icons                                                    |
| Dates        | `date-fns` + `date-fns-tz`   | Format API UTC timestamps in business zone                          |
| Testing      | Vitest (Node.js environment) | Date/timezone unit tests; manual browser checks for UI interactions |

Build reusable UI components in-project rather than relying entirely on a component kit. Pin compatible package versions during implementation.

## 3. Navigation and access

```text
/login                         Public
/employee                      Employee dashboard
/employee/history              Own attendance history
/hrd                           HRD overview
/hrd/employees                 Employee list
/hrd/employees/new             Create employee
/hrd/employees/:id             Employee detail/edit
/hrd/attendance                Attendance monitoring
/hrd/attendance/:id            Read-only attendance detail
```

`ProtectedRoute` checks authentication, then role. Backend remains the authority for permissions; hiding a button is not authorization. On token expiration, clear session and return to login with a concise message.

## 4. Employee journeys

### Login

- Email and password fields, show/hide password control, inline validation, loading state, generic invalid-credentials message.
- After success, route by role. No self-registration; HRD creates accounts.

### Employee dashboard

- Header: name, business-local date, WFH label.
- Primary status card: `Belum check-in`, `Sudah check-in`, or `Selesai`.
- If not checked in: primary **Check in** action.
- If checked in: show official check-in time and **Check out** action.
- If complete: show both official times and photos; no further action.
- Show 08:00 and 17:00 as work targets. If an action is late/early, present an informational badge, never an invented penalty.

### Check-in/check-out flow

1. Open action form or modal with clear title.
2. Select image from gallery or invoke camera where supported. Use `<input type="file" accept="image/jpeg,image/png,image/webp">`; do not use a mandatory `capture` attribute because gallery must remain available.
3. Show preview, filename/size, replace/remove control, optional note, and submit button.
4. Validate required image, accepted format, and size before upload. Backend repeats validation.
5. During upload, disable duplicate submit and show progress/loading.
6. On success, refresh `/attendance/today`, show time returned by API and a success message.
7. On `409`, refresh state and explain that action was already completed or sequence is invalid. On network failure, allow retry without assuming submission failed; refresh current state first.

### History

- Paginated list of `workDate`, check-in time, check-out time/status, and a detail view.
- Incomplete days show `Belum check-out`. Photos open in an authenticated viewer.
- Empty, loading, and error states are explicit.

## 5. HRD journeys

### Overview

- Summary cards: active employees, checked in today, completed today, and no check-in today. Use API-backed counts or derive from paginated-safe summary endpoint when implemented; do not calculate totals from a partial page.
- Quick links to employees and monitoring.

### Employee master

- Table with employee number, name, department, email, status, and actions.
- Search by name/number/email; pagination; active/inactive filter.
- Create/edit form with field-level validation and clear unique-email/NIK errors.
- Deactivation instead of deletion preserves attendance history. Show confirmation for deactivation.
- Initial password entry is an MVP choice; never display stored password after creation.

### Attendance monitoring

- Default to current business date. Filters: date range, employee, status (`CHECKED_IN`, `COMPLETE`, absent if API supports it).
- Table: employee, department, work date, check-in, check-out, timing flags, photo/detail action.
- Read-only detail: both photos, times, notes, and status. No edit/delete/approval controls.
- Filter state should be reflected in URL query parameters so a view can be shared or refreshed.

## 6. UI system and custom components

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  components/
    ui/
      Button.tsx
      TextField.tsx
      Select.tsx
      Modal.tsx
      Badge.tsx
      EmptyState.tsx
      ErrorState.tsx
      Pagination.tsx
      ConfirmDialog.tsx
    layout/
      AppShell.tsx
      Header.tsx
      Sidebar.tsx
  features/
    auth/
      api.ts
      AuthProvider.tsx
      LoginForm.tsx
    attendance/
      api.ts
      types.ts
      AttendanceStatusCard.tsx
      AttendanceActionForm.tsx
      PhotoPicker.tsx
      AttendanceHistory.tsx
    employees/
      api.ts
      types.ts
      EmployeeForm.tsx
      EmployeeTable.tsx
    monitoring/
      api.ts
      AttendanceFilters.tsx
      AttendanceTable.tsx
      AttendanceDetail.tsx
  lib/
    api-client.ts
    date-time.ts
    query-keys.ts
  pages/
    LoginPage.tsx
    EmployeeDashboardPage.tsx
    EmployeeHistoryPage.tsx
    HrdDashboardPage.tsx
    EmployeeListPage.tsx
    EmployeeEditorPage.tsx
    AttendanceMonitoringPage.tsx
    AttendanceDetailPage.tsx
```

Custom components that demonstrate the test objective: `PhotoPicker` (gallery/camera choice + preview), `AttendanceStatusCard` (state-driven actions), `AttendanceFilters`, `EmployeeForm`, and `AttendanceTable`. Keep domain components in feature folders; keep generic components in `components/ui`.

## 7. UX and visual direction

- Mobile-first employee flow: one prominent action, generous tap targets, short form, clear progress. HRD tables are desktop-first but remain usable on mobile with horizontal scroll or cards.
- Use a neutral surface, high-contrast text, one primary brand color, and restrained status colors. Do not rely on color alone; include text labels.
- Suggested spacing scale: 4/8/12/16/24/32 px. Consistent form labels and error placement.
- Dates/times always display a zone label such as `WIB` if the configured business zone is `Asia/Jakarta`.
- Accessibility: visible focus ring, semantic buttons/forms/tables, labeled file input, keyboard-operable modal, alt text for evidence photos, and clear error announcements.
- Photo preview should not expose a public URL. Revoke temporary browser object URLs when no longer needed.

## 8. Data/API integration

Use backend `/api` contract without a version segment. Define TypeScript interfaces from actual responses and centralize request functions. If practical, generate types from Swagger/OpenAPI after the backend stabilizes. Store token in memory with a session persistence strategy chosen during implementation; avoid spreading token handling across components. On refresh, `/api/auth/me` rehydrates user/role. For this test, an Authorization Bearer token is acceptable; document its storage and XSS tradeoff. A secure HTTP-only cookie would be preferable for a production deployment if backend/frontend hosting supports it.

Key query keys: `['auth','me']`, `['attendance','today']`, `['attendance','mine',filters]`, `['employees',filters]`, `['attendance','monitoring',filters]`. Invalidate only related queries after mutations. Do not optimistically mark attendance complete before the backend confirms the official time.

### Frontend state map

| API state                    | UI                                              |
| ---------------------------- | ----------------------------------------------- |
| No attendance today          | Check-in form enabled; checkout hidden/disabled |
| Checked in                   | Check-in disabled; checkout enabled             |
| Complete                     | Both actions disabled; show times/photos        |
| Upload pending               | Submit disabled; progress indicator             |
| Duplicate/invalid transition | Refetch today; show specific message            |
| Unauthorized                 | Redirect to login                               |
| Forbidden                    | Access-denied page                              |
| Network error                | Retry action and state refresh                  |

## 9. Acceptance scenarios

1. HRD logs in and creates a new active employee.
2. Employee logs in, chooses a photo from the gallery, checks in, and sees the **server-recorded** time.
3. Employee cannot check in twice for the same work date.
4. Employee checks out with photo and sees the completed state and both photos.
5. Checkout before check-in and duplicate checkout return helpful messages.
6. HRD filters attendance by date/employee and sees read-only details.
7. Employee cannot open another employee's attendance or photos.
8. Layout and upload controls work on mobile widths.

## 10. Delivery order

1. Day 1: app bootstrap, routes, design tokens, login screen, API client/auth context.
2. Day 2: employee dashboard, status card, photo picker, check-in/check-out integration.
3. Day 3: employee history, HRD employee list/form, attendance monitoring/detail.
4. Day 4: mobile polish, loading/error/empty states, accessibility, critical tests.
5. Day 5 buffer: cross-browser smoke test, README screenshots/setup, final GitHub handoff before 2 November 2026 08:00 WIB.

## 11. README handoff checklist

Include local setup, environment variables (`VITE_API_BASE_URL`, business zone display), demo HRD/employee accounts, page list, screenshot/GIF of both roles, architecture decisions, API link, test commands, known assumptions, and the open questions listed in the backend plan. Keep credentials development-only.
