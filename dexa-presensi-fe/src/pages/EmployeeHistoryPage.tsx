import { useBusinessDate } from '../lib/use-business-date';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { date, time, today } from '../lib/date';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';
import { AttendancePage } from '../lib/types';
import { formatDuration } from '../lib/duration';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Empty } from '../components/ui/Empty';
import { Status } from '../components/ui/Status';
import { Pager } from '../components/ui/Pager';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';
import { useAuth } from '../state/auth';

export function EmployeeHistory() {
  const { user } = useAuth();
  const businessDate = useBusinessDate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Number(params.get('limit')) || 10;
  const from = params.get('from') || today().slice(0, 7) + '-01';
  const to = params.get('to') || today();
  const filters = { dateFrom: from, dateTo: to };
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.delete('page');
    setParams(next);
  }
  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance', 'mine', businessDate, user?.id, page, limit, from, to],
    enabled: from <= to,
    queryFn: async () =>
      (await api.get<AttendancePage>('/attendance/me', { params: { page, limit, ...filters } }))
        .data,
  });
  return (
    <Shell>
      <PageHead
        eyebrow="EMPLOYEE"
        title="Attendance history"
        description="View your check-in and check-out records."
      />
      <div className="panel">
        <div className="filters">
          <DateRangeFilter from={from} to={to} onChange={update} />
          <label>
            Rows
            <select value={limit} onChange={(e) => update('limit', e.target.value)}>
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {data?.summary && (
          <div className="chart-legend">
            <span>
              Total work time: <strong>{formatDuration(data.summary.totalWorkedSeconds)}</strong>
            </span>
            <span>
              Recorded days: <strong>{data.total}</strong>
            </span>
            <span>
              Completed: <strong>{data.summary.completedRecords}</strong>
            </span>
            <span>
              Working: <strong>{data.summary.workingRecords}</strong>
            </span>
            <span>
              Incomplete: <strong>{data.summary.incompleteRecords}</strong>
            </span>
            <span>All matching dates · Pending check-outs excluded · No break deduction</span>
          </div>
        )}
        {from > to ? (
          <Notice>Start date cannot be after end date.</Notice>
        ) : isLoading ? (
          <Busy />
        ) : error ? (
          <Notice>{errorMessage(error)}</Notice>
        ) : !data?.items.length ? (
          <Empty>No attendance records yet.</Empty>
        ) : (
          <>
            <div className="history-list">
              {data.items.map((item) => (
                <Link
                  className="history-item"
                  key={item.id}
                  state={{ returnTo: location.pathname + location.search }}
                  to={`/employee/history/${item.id}`}
                >
                  <div className="history-icon">
                    <CalendarDays size={21} />
                  </div>
                  <div>
                    <strong>{date(item.workDate)}</strong>
                    <p>
                      {time(item.checkInAt)} → {time(item.checkOutAt)}
                    </p>
                    <small className="history-work-time">
                      Work time: {formatDuration(item.workedSeconds)}
                      {!item.checkOutAt &&
                        (item.status === 'INCOMPLETE'
                          ? ' · Check-out not recorded'
                          : ' · Awaiting check-out')}
                    </small>
                  </div>
                  <Status status={item.status} />
                  <ArrowRight size={18} />
                </Link>
              ))}
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
