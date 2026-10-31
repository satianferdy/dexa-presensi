import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useBlocker, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { ArrowLeft, Eye, EyeOff, UserRound, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Employee } from '../lib/types';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Button } from '../components/ui/Button';

export function EmployeeEditor() {
  const { id } = useParams();
  const editing = !!id;
  const initialized = useRef<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const nav = useNavigate();
  const cache = useQueryClient();
  const location = useLocation();
  const back = location.state?.returnTo || '/hrd/employees';
  const schema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(150),
    employeeNumber: z.string().trim().min(1, 'Employee ID is required').max(50),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
    password: editing ? z.string() : z.string().min(8, 'Use at least 8 characters'),
    department: z.string().trim().min(1, 'Department is required').max(100),
    position: z.string().trim().max(100),
    phone: z.string().trim().max(30),
  });
  type Fields = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    reset,
    setError: fieldError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Fields>({
    mode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      employeeNumber: '',
      email: '',
      password: '',
      department: '',
      position: '',
      phone: '',
    },
  });
  const [error, setError] = useState('');
  const employee = useQuery({
    queryKey: ['employees', 'detail', id],
    enabled: editing,
    queryFn: async () => (await api.get<Employee>(`/employees/${id}`)).data,
  });
  useEffect(() => {
    if (employee.data && initialized.current !== employee.data.id) {
      const e = employee.data;
      reset({
        fullName: e.fullName,
        employeeNumber: e.employeeNumber,
        email: e.email,
        password: '',
        department: e.department,
        position: e.position || '',
        phone: e.phone || '',
      });
      initialized.current = e.id;
    }
  }, [employee.data, reset]);
  const blocker = useBlocker(isDirty && !isSubmitting);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Discard your unsaved changes?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [isDirty]);
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      const { password, ...details } = values;
      if (editing) await api.patch(`/employees/${id}`, details);
      else await api.post('/employees', { ...details, password });
      reset(values);
      cache.invalidateQueries({ queryKey: ['employees'] });
      cache.invalidateQueries({ queryKey: ['attendance', 'dashboard'] });
      nav(back, {
        state: {
          flash: editing ? 'Employee updated successfully.' : 'Employee created successfully.',
        },
      });
    } catch (e) {
      const message = errorMessage(e);
      setError(message);
      const field = isAxiosError(e) ? e.response?.data?.field : undefined;
      if (field === 'email' || field === 'employeeNumber')
        fieldError(field, { message }, { shouldFocus: true });
    }
  });
  const fields = [
    ['fullName', 'Full name'],
    ['employeeNumber', 'Employee ID'],
    ['email', 'Email'],
    ...(!editing ? [['password', 'Initial password']] : []),
    ['department', 'Department'],
    ['position', 'Position'],
    ['phone', 'Phone number'],
  ] as [keyof Fields, string][];
  return (
    <Shell>
      <Link className="back-link" to={back}>
        <ArrowLeft size={17} />
        Back to employees
      </Link>
      <PageHead
        eyebrow="MASTER DATA"
        title={editing ? 'Edit employee' : 'Add employee'}
        description="Enter the employee's details."
      />
      {employee.isLoading ? (
        <Busy />
      ) : employee.error ? (
        <Notice>
          {errorMessage(employee.error)}{' '}
          <button onClick={() => employee.refetch()}>Try again</button>
        </Notice>
      ) : (
        <form className="panel employee-form" onSubmit={submit} noValidate>
          {error && <Notice>{error}</Notice>}
          <p className="required-note">
            <span className="required-mark" aria-hidden="true">
              *
            </span>{' '}
            Required fields
          </p>
          {(['employee', 'account'] as const).map((section) => (
            <section className="employee-form-section" key={section}>
              <div className="employee-section-title">
                {section === 'employee' ? <UserRound size={18} /> : <ShieldCheck size={18} />}
                <div>
                  <h2>{section === 'employee' ? 'Employee information' : 'Account access'}</h2>
                  <p>
                    {section === 'employee'
                      ? 'Personal details and work information.'
                      : editing
                        ? 'The employee uses this email to sign in.'
                        : 'Set up the employee’s sign-in credentials.'}
                  </p>
                </div>
              </div>
              <div className="form-grid">
                {fields
                  .filter(([key]) =>
                    section === 'account'
                      ? ['email', 'password'].includes(key)
                      : !['email', 'password'].includes(key),
                  )
                  .map(([key, label]) => (
                    <label key={key} htmlFor={key}>
                      <span>
                        {label}{' '}
                        {['position', 'phone'].includes(key) ? (
                          <span className="optional-label">(optional)</span>
                        ) : (
                          <span className="required-mark" aria-hidden="true">
                            *
                          </span>
                        )}
                      </span>
                      <div className={key === 'password' ? 'password-input' : ''}>
                        <input
                          id={key}
                          type={
                            key === 'password'
                              ? showPassword
                                ? 'text'
                                : 'password'
                              : key === 'email'
                                ? 'email'
                                : key === 'phone'
                                  ? 'tel'
                                  : 'text'
                          }
                          autoComplete={
                            key === 'password' ? 'new-password' : key === 'email' ? 'email' : 'off'
                          }
                          aria-required={!['position', 'phone'].includes(key)}
                          {...register(key)}
                          aria-invalid={!!errors[key]}
                          aria-describedby={errors[key] ? `${key}-error` : undefined}
                        />
                        {key === 'password' && (
                          <button
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        )}
                      </div>
                      {key === 'password' && (
                        <span className="field-hint">
                          Use at least 8 characters. Share the initial password securely with the
                          employee.
                        </span>
                      )}
                      {errors[key] && (
                        <span className="field-error" id={`${key}-error`}>
                          {errors[key]?.message}
                        </span>
                      )}
                    </label>
                  ))}
              </div>
            </section>
          ))}
          <div className="form-actions">
            <Link className="btn btn-secondary" to={back}>
              Cancel
            </Link>
            <Button type="submit" disabled={isSubmitting || (editing && !isDirty)}>
              {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}
            </Button>
          </div>
        </form>
      )}
    </Shell>
  );
}
