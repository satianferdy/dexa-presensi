import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Users } from 'lucide-react';
import { getDashboardSummary } from '../features/monitoring/api';
import { date, today } from '../lib/date';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';

export function HrdHome() {
  const businessDate = today();
  const summary = useQuery({
    queryKey: ['attendance', 'dashboard', businessDate],
    queryFn: ({ signal }) => getDashboardSummary(signal),
  });
  const active = { data: summary.data ? { total: summary.data.employees.active } : undefined };
  const employeeTotal = {
    data: summary.data ? { total: summary.data.employees.total } : undefined,
  };
  const all = {
    data: summary.data ? { total: summary.data.today.total } : undefined,
    isLoading: summary.isLoading,
    error: summary.error,
  };
  const done = {
    data: summary.data ? { total: summary.data.today.completed } : undefined,
    isLoading: summary.isLoading,
    error: summary.error,
  };
  const trend = {
    data: summary.data?.trend,
    isLoading: summary.isLoading,
    error: summary.error,
    refetch: summary.refetch,
  };
  const numbers = [
    {
      label: 'Active employees',
      value: active.data?.total,
      icon: Users,
      href: '/hrd/employees?status=active',
    },
    {
      label: 'Checked in',
      value: all.data?.total,
      icon: Clock3,
      href: `/hrd/attendance?from=${businessDate}&to=${businessDate}`,
    },
    {
      label: 'Completed',
      value: done.data?.total,
      icon: CheckCircle2,
      href: `/hrd/attendance?from=${businessDate}&to=${businessDate}&status=COMPLETE`,
    },
    {
      label: 'Inactive employees',
      value:
        active.data && employeeTotal.data
          ? employeeTotal.data.total - active.data.total
          : undefined,
      icon: Users,
      href: '/hrd/employees?status=inactive',
    },
  ];
  return (
    <Shell>
      <PageHead
        eyebrow="HR DASHBOARD"
        title="Today's overview"
        description={`${date(today())} · Monitor employee WFH attendance.`}
      />
      <div className="stats-grid">
        {numbers.map(({ label, value, icon: Icon, href }) => (
          <Link className="stat-card" key={label} to={href}>
            <div className="stat-icon">
              <Icon size={22} />
            </div>
            <span>{label}</span>
            <strong>{value ?? '—'}</strong>
          </Link>
        ))}
      </div>
      <div className="dashboard-charts">
        <section className="panel chart-panel" aria-labelledby="trend-heading">
          <div className="chart-heading">
            <div>
              <h2 id="trend-heading">Attendance trend</h2>
              <p>Check-ins and completed workdays · Last 7 days</p>
            </div>
            <span className="chart-period">7 days</span>
          </div>
          {trend.isLoading ? (
            <Busy />
          ) : trend.error ? (
            <Notice>
              Unable to load the attendance trend.{' '}
              <button onClick={() => trend.refetch()}>Try again</button>
            </Notice>
          ) : (
            trend.data && (
              <>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot legend-complete" />
                    Completed
                  </span>
                  <span>
                    <i className="legend-dot legend-open" />
                    Checked in, not checked out
                  </span>
                </div>
                <div
                  className="trend-chart"
                  role="img"
                  aria-label={trend.data
                    .map(
                      (item) =>
                        `${date(item.day)}: ${item.total} checked in, ${item.completed} completed`,
                    )
                    .join('; ')}
                >
                  {trend.data.map((item) => {
                    const max = Math.max(1, ...(trend.data ?? []).map((day) => day.total));
                    const height = (item.total / max) * 100;
                    const completedHeight = item.total ? (item.completed / item.total) * 100 : 0;
                    return (
                      <div className="trend-column" key={item.day}>
                        <span className="trend-value">{item.total}</span>
                        <div className="bar-track">
                          <div
                            className="bar-stack"
                            style={{ height: `${height}%` }}
                            title={`${date(item.day)}: ${item.total} checked in, ${item.completed} completed`}
                          >
                            <div
                              className="bar-completed"
                              style={{ height: `${completedHeight}%` }}
                            />
                          </div>
                        </div>
                        <span className="trend-label">
                          {format(parseISO(item.day), 'EEE')}
                          <small>{format(parseISO(item.day), 'd MMM')}</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}
        </section>
        <section className="panel chart-panel" aria-labelledby="status-heading">
          <div className="chart-heading">
            <div>
              <h2 id="status-heading">Today's attendance</h2>
              <p>Breakdown of submitted records</p>
            </div>
          </div>
          {all.isLoading || done.isLoading ? (
            <Busy />
          ) : all.error || done.error ? (
            <Notice>Unable to load today's attendance.</Notice>
          ) : (
            <>
              <div className="status-chart">
                <div
                  className="donut"
                  style={{
                    background: all.data?.total
                      ? `conic-gradient(#b51d2a 0 ${((done.data?.total ?? 0) / all.data.total) * 100}%, #f3cdd1 0)`
                      : '#f0eded',
                  }}
                >
                  <div>
                    <strong>{all.data?.total ?? 0}</strong>
                    <span>check-ins</span>
                  </div>
                </div>
                <div className="status-breakdown">
                  <Link
                    className="back-link"
                    to={`/hrd/attendance?from=${businessDate}&to=${businessDate}&status=CHECKED_IN`}
                  >
                    View awaiting check-out →
                  </Link>
                  <div>
                    <span>
                      <i className="legend-dot legend-complete" />
                      Completed
                    </span>
                    <strong>{done.data?.total ?? 0}</strong>
                  </div>
                  <div>
                    <span>
                      <i className="legend-dot legend-open" />
                      Awaiting check-out
                    </span>
                    <strong>{Math.max(0, (all.data?.total ?? 0) - (done.data?.total ?? 0))}</strong>
                  </div>
                </div>
              </div>
              <p className="chart-note">
                Only submitted attendance is shown. Employee totals include active and inactive
                accounts.
              </p>
            </>
          )}
        </section>
      </div>
      <div className="quick-grid">
        <Link to="/hrd/attendance" className="quick-card">
          <CalendarDays size={23} />
          <h2>Attendance monitoring</h2>
          <p>View employee check-ins, check-outs, and proof photos.</p>
          <span>
            View attendance <ArrowRight size={16} />
          </span>
        </Link>
        <Link to="/hrd/employees" className="quick-card">
          <Users size={23} />
          <h2>Employee records</h2>
          <p>Manage employee accounts and information.</p>
          <span>
            View employees <ArrowRight size={16} />
          </span>
        </Link>
      </div>
    </Shell>
  );
}
