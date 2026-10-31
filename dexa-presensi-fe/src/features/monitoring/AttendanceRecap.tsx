import { useBusinessDate } from '../../lib/use-business-date';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { eachDayOfInterval, format, parseISO, differenceInCalendarDays, isWeekend } from 'date-fns';
import { LogIn, LogOut } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { date, time, zoneLabel } from '../../lib/date';
import { formatDuration } from '../../lib/duration';
import type { Attendance, Page } from '../../lib/types';
import { Busy } from '../../components/ui/Busy';
import { Notice } from '../../components/ui/Notice';
import { Empty } from '../../components/ui/Empty';
import { Pager } from '../../components/ui/Pager';

type RecapEmployee = {
  id: string;
  fullName: string;
  employeeNumber: string;
  department: string;
  isActive: boolean;
  records: Attendance[];
  totalWorkedSeconds: number;
};
export function AttendanceRecap({
  from,
  to,
  employeeId,
  status,
  page,
  limit,
  onPage,
}: {
  from: string;
  to: string;
  employeeId: string;
  status: string;
  page: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  const location = useLocation();
  const businessDate = useBusinessDate();
  const valid = from <= to && differenceInCalendarDays(parseISO(to), parseISO(from)) < 62;
  const result = useQuery({
    queryKey: ['attendance', 'recap', businessDate, from, to, employeeId, status, page, limit],
    enabled: valid,
    queryFn: async ({ signal }) =>
      (
        await api.get<Page<RecapEmployee>>('/attendance/recap', {
          signal,
          params: {
            dateFrom: from,
            dateTo: to,
            employeeId: employeeId || undefined,
            status: status || undefined,
            page,
            limit,
          },
        })
      ).data,
  });
  if (!valid) return <Notice>Select a range of up to 62 days for the recap view.</Notice>;
  if (result.isLoading) return <Busy />;
  if (result.error)
    return (
      <Notice>
        {errorMessage(result.error)} <button onClick={() => result.refetch()}>Try again</button>
      </Notice>
    );
  if (!result.data?.items.length) return <Empty>No employees match these filters.</Empty>;
  const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  return (
    <>
      <div className="recap-heading">
        <div>
          <h2>Attendance recap</h2>
          <p>
            {date(from)} – {date(to)} · {result.data.total} employees · Times in {zoneLabel()}
          </p>
        </div>
      </div>
      <div className="recap-legend">
        <span>
          <b className="recap-badge complete">C</b>Completed
        </span>
        <span>
          <b className="recap-badge working">W</b>Working
        </span>
        <span>
          <b className="recap-badge incomplete">I</b>Incomplete
        </span>
        <span>
          <b className="recap-badge late">L</b>Late check-in
        </span>
        <span>— {status ? 'No matching record' : 'No record'}</span>
      </div>
      <div
        className="recap-scroll"
        tabIndex={0}
        aria-label="Attendance recap. Scroll horizontally to view all dates."
      >
        <table className="recap-table">
          <thead>
            <tr>
              <th className="recap-person">Employee</th>
              {days.map((day) => (
                <th
                  key={format(day, 'yyyy-MM-dd')}
                  className={isWeekend(day) ? 'recap-weekend' : ''}
                >
                  <span>{format(day, 'EEE')}</span>
                  <strong>{format(day, 'dd/MM')}</strong>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.data.items.map((employee) => {
              const records = new Map(
                employee.records
                  .filter((record) => !status || record.status === status)
                  .map((record) => [record.workDate, record]),
              );
              return (
                <tr key={employee.id}>
                  <th className="recap-person" scope="row">
                    <div className="recap-identity">
                      <div className="avatar">
                        {employee.fullName
                          .split(' ')
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')}
                      </div>
                      <div>
                        <strong>{employee.fullName}</strong>
                        <small>
                          {employee.employeeNumber}
                          {!employee.isActive ? ' · Inactive' : ''}
                        </small>
                        <small>{employee.department}</small>
                        <small className="recap-work-total">
                          Total: {formatDuration(employee.totalWorkedSeconds)}
                        </small>
                      </div>
                    </div>
                  </th>
                  {days.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const record = records.get(key);
                    return (
                      <td key={key} className={isWeekend(day) ? 'recap-weekend' : ''}>
                        {record ? (
                          <Link
                            className="recap-cell"
                            state={{ returnTo: location.pathname + location.search }}
                            to={`/hrd/attendance/${record.id}`}
                            aria-label={`${employee.fullName}, ${date(key)}, ${record.isLate ? 'late check-in, ' : ''}${record.status === 'COMPLETE' ? 'completed' : record.status === 'INCOMPLETE' ? 'incomplete, check-out not recorded' : 'working, awaiting check-out'}`}
                          >
                            <span className="recap-badges">
                              {record.isLate && (
                                <b className="recap-badge late" title="Late check-in">
                                  L
                                </b>
                              )}
                              <b
                                className={`recap-badge ${record.status === 'COMPLETE' ? 'complete' : record.status === 'INCOMPLETE' ? 'incomplete' : 'working'}`}
                              >
                                {record.status === 'COMPLETE'
                                  ? 'C'
                                  : record.status === 'INCOMPLETE'
                                    ? 'I'
                                    : 'W'}
                              </b>
                            </span>
                            <span>
                              <LogIn size={12} />
                              {time(record.checkInAt).split(' ')[0]}
                            </span>
                            <span>
                              <LogOut size={12} />
                              {record.checkOutAt ? time(record.checkOutAt).split(' ')[0] : '—'}
                            </span>
                            <span
                              className="recap-work-time"
                              title="Work time · no break deduction"
                            >
                              {formatDuration(record.workedSeconds)}
                            </span>
                          </Link>
                        ) : (
                          <span
                            className="recap-empty"
                            title={status ? 'No matching record' : 'No attendance record submitted'}
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="recap-note">
        Click a recorded day to view its photos and details. Empty cells do not indicate absence or
        leave; weekends are highlighted for reference. Work totals cover the selected dates and
        status filter, exclude pending check-outs, and do not deduct breaks.
      </p>
      <Pager page={page} total={result.data.total} limit={limit} onChange={onPage} />
    </>
  );
}
