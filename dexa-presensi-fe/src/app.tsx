import { Navigate, Route, Routes } from 'react-router-dom';
import { Guard } from './app/Guard';
import { Login } from './pages/LoginPage';
import { EmployeeHome } from './pages/EmployeeDashboardPage';
import { EmployeeHistory } from './pages/EmployeeHistoryPage';
import { AttendanceDetail } from './pages/AttendanceDetailPage';
import { HrdHome } from './pages/HrdDashboardPage';
import { EmployeeList } from './pages/EmployeeListPage';
import { EmployeeEditor } from './pages/EmployeeEditorPage';
import { Monitoring } from './pages/AttendanceMonitoringPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/employee"
        element={
          <Guard role="EMPLOYEE">
            <EmployeeHome />
          </Guard>
        }
      />
      <Route
        path="/employee/history"
        element={
          <Guard role="EMPLOYEE">
            <EmployeeHistory />
          </Guard>
        }
      />
      <Route
        path="/employee/history/:id"
        element={
          <Guard role="EMPLOYEE">
            <AttendanceDetail />
          </Guard>
        }
      />
      <Route
        path="/hrd"
        element={
          <Guard role="HRD_ADMIN">
            <HrdHome />
          </Guard>
        }
      />
      <Route
        path="/hrd/employees"
        element={
          <Guard role="HRD_ADMIN">
            <EmployeeList />
          </Guard>
        }
      />
      <Route
        path="/hrd/employees/new"
        element={
          <Guard role="HRD_ADMIN">
            <EmployeeEditor />
          </Guard>
        }
      />
      <Route
        path="/hrd/employees/:id"
        element={
          <Guard role="HRD_ADMIN">
            <EmployeeEditor />
          </Guard>
        }
      />
      <Route
        path="/hrd/attendance"
        element={
          <Guard role="HRD_ADMIN">
            <Monitoring />
          </Guard>
        }
      />
      <Route
        path="/hrd/attendance/:id"
        element={
          <Guard role="HRD_ADMIN">
            <AttendanceDetail hrd />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
