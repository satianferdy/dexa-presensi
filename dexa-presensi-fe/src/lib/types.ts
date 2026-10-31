export type Role = 'EMPLOYEE' | 'HRD_ADMIN';
export type User = {
  timezone: string;
  id: string;
  email: string;
  role: Role;
  employee: { id: string; employeeNumber: string; fullName: string; department: string } | null;
};
export type Employee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  position: string | null;
  phone: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
};
export type Attendance = {
  id: string;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'employeeNumber' | 'fullName' | 'department'>;
  workDate: string;
  status: 'CHECKED_IN' | 'COMPLETE' | 'INCOMPLETE';
  checkInAt: string;
  checkOutAt: string | null;
  workedSeconds: number | null;
  checkInNote: string | null;
  checkOutNote: string | null;
  isLate: boolean;
  isEarlyCheckout: boolean | null;
  checkInPhotoUrl: string;
  checkOutPhotoUrl: string | null;
};
export type Today = (Attendance | { status: 'NOT_CHECKED_IN'; workDate: string }) & {
  previousIncomplete?: { id: string; workDate: string; checkInAt: string } | null;
};
export type Page<T> = { items: T[]; total: number; page: number; limit: number };
export type AttendancePage = Page<Attendance> & {
  summary: {
    totalWorkedSeconds: number;
    completedRecords: number;
    incompleteRecords: number;
    workingRecords: number;
  };
};
