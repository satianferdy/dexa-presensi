import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';
import { UpdateEmployeeDto } from './update-employee.dto';

describe('Employee input normalization', () => {
  const valid = {
    email: '  PERSON@EXAMPLE.TEST  ',
    password: 'password123',
    employeeNumber: ' EMP-1 ',
    fullName: ' Person ',
    department: ' IT ',
  };
  it('normalizes whitespace and email before validating', async () => {
    const dto = plainToInstance(CreateEmployeeDto, valid);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('person@example.test');
    expect(dto.fullName).toBe('Person');
    expect(dto.employeeNumber).toBe('EMP-1');
  });
  it('rejects whitespace-only required values on create', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      ...valid,
      fullName: '   ',
      department: '  ',
      employeeNumber: '  ',
    });
    const fields = (await validate(dto)).map((error) => error.property);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'department', 'employeeNumber']));
  });
  it('rejects whitespace-only required values on update', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, { fullName: '  ', department: '  ' });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['fullName', 'department']),
    );
  });
  it.each(['email', 'employeeNumber', 'fullName', 'department', 'position', 'phone'])(
    'rejects explicit null for update field %s',
    async (field) => {
      const dto = plainToInstance(UpdateEmployeeDto, { [field]: null });
      expect((await validate(dto)).map((error) => error.property)).toContain(field);
    },
  );
  it('allows omitted fields and empty optional profile strings on update', async () => {
    expect(await validate(plainToInstance(UpdateEmployeeDto, {}))).toHaveLength(0);
    expect(
      await validate(plainToInstance(UpdateEmployeeDto, { position: '', phone: '' })),
    ).toHaveLength(0);
  });
});
