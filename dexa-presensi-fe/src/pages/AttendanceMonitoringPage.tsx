import { useBusinessDate } from '../lib/use-business-date';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, parseISO, subMonths } from 'date-fns';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';
import { useDebounced } from '../lib/use-debounced';
import { ArrowRight } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { date, time, today } from '../lib/date';
import { AttendancePage, Employee, Page } from '../lib/types';
import { formatDuration } from '../lib/duration';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Empty } from '../components/ui/Empty';
import { Status } from '../components/ui/Status';
import { Pager } from '../components/ui/Pager';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';
import { AttendanceRecap } from '../features/monitoring/AttendanceRecap';

export function Monitoring() {
  const businessDate = useBusinessDate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'recap';
  const page = Number(params.get('page') || 1);
  const period = params.get('period') === 'month' ? 'month' : 'range';
  const requestedMonth = params.get('month') || today().slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : today().slice(0, 7);
  const from =
    period === 'month'
      ? `${month}-01`
      : params.get('from') || format(subMonths(parseISO(today()), 1), 'yyyy-MM-dd');
  const to =
    period === 'month'
      ? format(endOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd')
      : params.get('to') || today();
  const limit = Number(params.get('limit')) || 10;
  const status = params.get('status') || '';
  const search = params.get('employeeId') || '';
  const [employeeSearch, setEmployeeSearch] = useState('');
  const debounced = useDebounced(employeeSearch);
  const [showEmployees, setShowEmployees] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance', 'monitor', businessDate, page, from, to, status, search, limit],
    enabled: from <= to && view === 'list',
    queryFn: async () =>
      (
        await api.get<AttendancePage>('/attendance', {
          params: {
            page,
            limit,
            dateFrom: from,
            dateTo: to,
            status: status || undefined,
            employeeId: search || undefined,
          },
        })
      ).data,
  });
  const employees = useQuery({
    queryKey: ['employees', 'filter', debounced],
    queryFn: async () =>
      (
        await api.get<Page<Employee>>('/employees', {
          params: { limit: 20, search: debounced || undefined },
        })
      ).data,
  });
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }
  return (
    <Shell>
      <PageHead
        eyebrow="HR MONITORING"
        title="Employee attendance"
        description="Monitor WFH attendance and view proof photos. Attendance records are read-only."
      />
      <div className="panel">
        <div className="monitoring-toolbar">
          <div className="monitor-toolbar-top">
            <div className="period-mode" role="group" aria-label="Period filter mode">
              <button
                type="button"
                aria-pressed={period === 'range'}
                onClick={() => update('period', 'range')}
              >
                Date range
              </button>
              <button
                type="button"
                aria-pressed={period === 'month'}
                onClick={() => update('period', 'month')}
              >
                Monthly
              </button>
            </div>
            <div className="monitor-view" role="group" aria-label="Attendance view">
              <Button
                variant={view === 'recap' ? 'primary' : 'secondary'}
                onClick={() => update('view', 'recap')}
                aria-pressed={view === 'recap'}
              >
                Recap
              </Button>
              <Button
                variant={view === 'list' ? 'primary' : 'secondary'}
                onClick={() => update('view', 'list')}
                aria-pressed={view === 'list'}
              >
                List
              </Button>
            </div>
          </div>
          <div className="filters monitoring-filters">
            {period === 'month' ? (
              <label className="month-filter">
                Month
                <input
                  type="month"
                  value={month}
                  onChange={(event) => update('month', event.target.value)}
                />
              </label>
            ) : (
              <DateRangeFilter from={from} to={to} onChange={update} />
            )}
            <div
              className="employee-picker"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setShowEmployees(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setShowEmployees(false);
              }}
            >
              <label htmlFor="employee-filter">Employee</label>
              <input
                id="employee-filter"
                placeholder="Search name or employee ID..."
                value={employeeSearch}
                onFocus={() => setShowEmployees(true)}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setShowEmployees(true);
                  if (search) update('employeeId', '');
                }}
              />
              {showEmployees && (
                <div className="picker-results">
                  <button
                    type="button"
                    onClick={() => {
                      update('employeeId', '');
                      setEmployeeSearch('');
                      setShowEmployees(false);
                    }}
                  >
                    All employees
                  </button>
                  {employees.isLoading ? (
                    <span>Loading...</span>
                  ) : employees.error ? (
                    <span>Unable to load employees</span>
                  ) : employees.data?.items.length ? (
                    employees.data.items.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          update('employeeId', item.id);
                          setEmployeeSearch(item.fullName);
                          setShowEmployees(false);
                        }}
                      >
                        {item.fullName} <small>{item.employeeNumber}</small>
                      </button>
                    ))
                  ) : (
                    <span>No employees found</span>
                  )}
                </div>
              )}
            </div>
            <label>
              Status
              <select value={status} onChange={(e) => update('status', e.target.value)}>
                <option value="">All statuses</option>
                <option value="CHECKED_IN">Working</option>
                <option value="INCOMPLETE">Incomplete</option>
                <option value="COMPLETE">Completed</option>
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
            <Button
              variant="secondary"
              onClick={() => {
                setParams({ view });
                setEmployeeSearch('');
                setShowEmployees(false);
              }}
            >
              Reset filter
            </Button>
          </div>
        </div>
        {from > to ? (
          <Notice>Start date cannot be after end date.</Notice>
        ) : view === 'recap' ? (
          <AttendanceRecap
            from={from}
            to={to}
            employeeId={search}
            status={status}
            page={page}
            limit={limit}
            onPage={(p) => {
              const next = new URLSearchParams(params);
              next.set('page', String(p));
              setParams(next);
            }}
          />
        ) : isLoading ? (
          <Busy />
        ) : error ? (
          <Notice>{errorMessage(error)}</Notice>
        ) : !data?.items.length ? (
          <Empty>No attendance records match these filters.</Empty>
        ) : (
          <>
            <div className="chart-legend">
              <span>
                Total work time: <strong>{formatDuration(data.summary.totalWorkedSeconds)}</strong>
              </span>
              <span>{data.summary.completedRecords} completed records · All matching results</span>
              <span>No break deduction · Pending check-outs excluded</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employees</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Work time</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.employee?.fullName || '—'}</strong>
                        <small>{item.employee?.department}</small>
                      </td>
                      <td>{date(item.workDate)}</td>
                      <td>
                        {time(item.checkInAt)}
                        {item.isLate && <small className="text-danger">After 08:00</small>}
                      </td>
                      <td>{time(item.checkOutAt)}</td>
                      <td>
                        <strong>{formatDuration(item.workedSeconds)}</strong>
                        {!item.checkOutAt && (
                          <small>
                            {item.status === 'INCOMPLETE'
                              ? 'Check-out not recorded'
                              : 'Awaiting check-out'}
                          </small>
                        )}
                      </td>
                      <td>
                        <Status status={item.status} />
                      </td>
                      <td>
                        <Link
                          state={{ returnTo: location.pathname + location.search }}
                          to={`/hrd/attendance/${item.id}`}
                        >
                          View <ArrowRight size={14} />
                        </Link>
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
              onChange={(p) => {
                const next = new URLSearchParams(params);
                next.set('page', String(p));
                setParams(next);
              }}
            />
          </>
        )}
      </div>
    </Shell>
  );
}
