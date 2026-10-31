import { UserRole } from '../database/entities/user.entity';

export interface AuthUser {
  id: string;
  role: UserRole;
  employeeId: string | null;
}
