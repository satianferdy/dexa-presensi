import 'reflect-metadata';
import 'dotenv/config';
import * as argon2 from 'argon2';
import dataSource from './data-source';
import { User, UserRole } from './entities/user.entity';
import { Employee } from './entities/employee.entity';

const employees = [
  ['Andi Pratama', 'Information Technology', 'Frontend Developer'],
  ['Budi Santoso', 'Information Technology', 'Backend Developer'],
  ['Citra Lestari', 'Human Resources', 'HR Officer'],
  ['Dewi Anggraini', 'Finance', 'Accountant'],
  ['Eko Saputra', 'Operations', 'Operations Staff'],
  ['Fitri Handayani', 'Marketing', 'Marketing Specialist'],
  ['Gilang Ramadhan', 'Sales', 'Sales Executive'],
  ['Hana Maharani', 'Quality Assurance', 'QA Analyst'],
  ['Indra Wijaya', 'Research and Development', 'Research Associate'],
  ['Jihan Putri', 'Procurement', 'Procurement Staff'],
] as const;

async function seed(): Promise<void> {
  const email = (process.env.SEED_HRD_EMAIL ?? 'hrd@example.test').trim().toLowerCase();
  const password = process.env.SEED_HRD_PASSWORD ?? 'password';
  const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD ?? 'password';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new Error('SEED_HRD_EMAIL must be a valid email address');
  }
  if (password.length < 8 || employeePassword.length < 8) {
    throw new Error('Seed passwords must contain at least 8 characters');
  }

  await dataSource.initialize();
  try {
    const result = await dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const profiles = manager.getRepository(Employee);
      let createdUsers = 0;
      let createdEmployees = 0;

      const ensureUser = async (accountEmail: string, role: UserRole, accountPassword: string) => {
        const existing = await users.findOneBy({ email: accountEmail });
        if (existing) {
          if (existing.role !== role) {
            throw new Error(`Seed email ${accountEmail} is already assigned to a different role`);
          }
          return existing;
        }
        const user = await users.save(
          users.create({
            email: accountEmail,
            passwordHash: await argon2.hash(accountPassword),
            role,
            isActive: true,
          }),
        );
        createdUsers++;
        return user;
      };

      await ensureUser(email, UserRole.HRD_ADMIN, password);
      for (const [index, [fullName, department, position]] of employees.entries()) {
        const sequence = String(index + 1).padStart(3, '0');
        const employeeNumber = `DEMO-${sequence}`;
        const user = await ensureUser(
          `employee${sequence}@example.test`,
          UserRole.EMPLOYEE,
          employeePassword,
        );
        const byNumber = await profiles.findOneBy({ employeeNumber });
        const byUser = await profiles.findOneBy({ userId: user.id });
        if (byNumber || byUser) {
          if (byNumber?.userId !== user.id || byUser?.employeeNumber !== employeeNumber) {
            throw new Error(`Seed employee ${employeeNumber} conflicts with an existing profile`);
          }
          continue;
        }
        await profiles.save(
          profiles.create({
            userId: user.id,
            employeeNumber,
            fullName,
            department,
            position,
            phone: null,
          }),
        );
        createdEmployees++;
      }
      return { createdUsers, createdEmployees };
    });
    process.stdout.write(
      `Demo seed completed: ${result.createdUsers} users and ${result.createdEmployees} employee profiles created.\n` +
        `Admin: ${email}\nEmployees: employee001@example.test through employee010@example.test\n` +
        'Existing accounts, passwords, and attendance records were preserved.\n',
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
