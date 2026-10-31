import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ModalFocus } from '../components/ui/ModalFocus';
import { useDebounced } from '../lib/use-debounced';
import { Search } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Employee, Page } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Empty } from '../components/ui/Empty';
import { Pager } from '../components/ui/Pager';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';

export function EmployeeList() {
  const location = useLocation(),
    navigate = useNavigate();
  const [success, setSuccess] = useState<string>(location.state?.flash || '');
  useEffect(() => {
    if (location.state?.flash)
      navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate]);
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '',
    status = params.get('status') || '';
  const page = Math.max(1, Number(params.get('page')) || 1),
    limit = [10, 20, 50].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 10;
  const sort = params.get('sort') || 'fullName:ASC';
  const [sortBy, order] = sort.split(':');
  const debounced = useDebounced(search);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const [target, setTarget] = useState<Employee | null>(null);
  const query = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', debounced, status, page, limit, sort],
    queryFn: async () =>
      (
        await api.get<Page<Employee>>('/employees', {
          params: {
            search: debounced || undefined,
            status: status || undefined,
            page,
            limit,
            sortBy,
            order,
          },
        })
      ).data,
  });
  useEffect(() => {
    if (data && !isLoading && page > Math.max(1, Math.ceil(data.total / limit))) {
      const next = new URLSearchParams(params);
      next.set('page', String(Math.max(1, Math.ceil(data.total / limit))));
      setParams(next, { replace: true });
    }
  }, [data, isLoading, page, limit, params, setParams]);
  const mutation = useMutation({
    mutationFn: async (employee: Employee) => {
      return api.patch(`/employees/${employee.id}/status`, { isActive: !employee.isActive });
    },
    onSuccess: (_, employee) => {
      setSuccess(
        `${employee.fullName} ${employee.isActive ? 'deactivated' : 'activated'} successfully.`,
      );
      setTarget(null);
      query.invalidateQueries({ queryKey: ['employees'] });
      query.invalidateQueries({ queryKey: ['attendance', 'dashboard'] });
      query.invalidateQueries({ queryKey: ['attendance', 'recap'] });
    },
  });
  return (
    <Shell>
      <PageHead
        eyebrow="MASTER DATA"
        title="Employees"
        description="Manage employee information and account access."
        action={
          <Link
            className="btn btn-primary"
            state={{ returnTo: location.pathname + location.search }}
            to="/hrd/employees/new"
          >
            + Add employee
          </Link>
        }
      />
      {success && <Notice type="success">{success}</Notice>}
      <div className="panel">
        <div className="filters employee-filters">
          <label className="search-field">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => {
                update('search', e.target.value);
              }}
              placeholder="Search name, email, or employee ID"
            />
          </label>
          <select
            value={status}
            onChange={(e) => {
              update('status', e.target.value);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <label>
            Sort by
            <select
              aria-label="Sort employees"
              value={sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="fullName:ASC">Name A–Z</option>
              <option value="fullName:DESC">Name Z–A</option>
              <option value="employeeNumber:ASC">Employee ID ↑</option>
              <option value="employeeNumber:DESC">Employee ID ↓</option>
            </select>
          </label>
          <label>
            Rows
            <select value={limit} onChange={(e) => update('limit', e.target.value)}>
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </Button>
        </div>
        {isLoading ? (
          <Busy />
        ) : error ? (
          <Notice>{errorMessage(error)}</Notice>
        ) : !data?.items.length ? (
          <Empty>No matching employees found.</Empty>
        ) : (
          <>
            <div className="table-wrap employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employees</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.fullName}</strong>
                        <small>{item.email}</small>
                      </td>
                      <td>{item.employeeNumber}</td>
                      <td>
                        <strong>{item.department}</strong>
                        <small>{item.position || '—'}</small>
                      </td>
                      <td>
                        <span
                          className={`status ${item.isActive ? 'status-complete' : 'status-inactive'}`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <Link
                          state={{ returnTo: location.pathname + location.search }}
                          to={`/hrd/employees/${item.id}`}
                        >
                          Edit
                        </Link>
                        <button
                          className={item.isActive ? 'text-danger' : ''}
                          onClick={() => {
                            mutation.reset();
                            setTarget(item);
                          }}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              total={data.total}
              limit={limit}
              onChange={(p) => update('page', String(p))}
            />
          </>
        )}
      </div>
      {target && (
        <div className="modal-backdrop">
          <ModalFocus
            onClose={() => {
              if (!mutation.isPending) setTarget(null);
            }}
          >
            <div className="modal" role="dialog" aria-modal="true">
              <h2>
                {target.isActive ? 'Deactivate' : 'Activate'} {target.fullName}?
              </h2>
              <p>
                {target.isActive
                  ? 'The account cannot sign in, but its attendance history will be retained.'
                  : 'The employee will be able to sign in again. Attendance history will be retained.'}
              </p>
              {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
              <div className="form-actions">
                <Button
                  variant="secondary"
                  onClick={() => setTarget(null)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button onClick={() => mutation.mutate(target)} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Updating…' : target.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </ModalFocus>
        </div>
      )}
    </Shell>
  );
}
