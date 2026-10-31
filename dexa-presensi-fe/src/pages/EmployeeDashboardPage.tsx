import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock3, CheckCircle2, Circle, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { date, time, zoneLabel } from '../lib/date';
import { useBusinessDate } from '../lib/use-business-date';
import { formatDuration } from '../lib/duration';
import { Today } from '../lib/types';
import { useAuth } from '../state/auth';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Status } from '../components/ui/Status';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';
import { Evidence } from '../features/attendance/Evidence';
import { AttendanceAction } from '../features/attendance/AttendanceAction';

export function EmployeeHome() {
  const { user } = useAuth();
  const day = useBusinessDate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance', 'today', user?.id, day],
    refetchInterval: 60000,
    queryFn: async ({ signal }) => (await api.get<Today>('/attendance/today', { signal })).data,
  });
  const [action, setAction] = useState<'check-in' | 'check-out' | null>(null);
  const [success, setSuccess] = useState('');
  useEffect(() => {
    setAction(null);
    setSuccess('');
  }, [day]);
  const record = data && 'id' in data ? data : null;
  return (
    <Shell>
      <PageHead
        eyebrow="EMPLOYEE DASHBOARD"
        title={`Hello, ${user?.employee?.fullName?.split(' ')[0] || 'there'} 👋`}
        description={`${date(data?.workDate || day)} · Working hours 08:00–17:00 ${zoneLabel()}`}
      />
      {success && <Notice type="success">{success}</Notice>}
      {data?.previousIncomplete && (
        <div className="incomplete-notice" role="status">
          <strong>Your previous attendance is incomplete.</strong>
          <p>
            No check-out was recorded for {date(data.previousIncomplete.workDate)}. Contact HR if
            you need assistance.
          </p>
          <Link to={`/employee/history/${data.previousIncomplete.id}`}>View record →</Link>
        </div>
      )}
      {isLoading ? (
        <Busy />
      ) : error ? (
        <Notice>
          Unable to load attendance. <button onClick={() => refetch()}>Try again</button>
        </Notice>
      ) : (
        <>
          <div className="hero-card">
            <div className="hero-top">
              <div>
                <div className="eyebrow">TODAY'S STATUS</div>
                <h2>
                  {record?.status === 'COMPLETE'
                    ? "Today's attendance is complete"
                    : record
                      ? 'You are checked in'
                      : 'Ready to start work?'}
                </h2>
                <p>
                  {record?.status === 'COMPLETE'
                    ? 'Your WFH attendance has been recorded.'
                    : record
                      ? 'Remember to check out when you finish work.'
                      : 'Start your workday by checking in with a proof photo.'}
                </p>
              </div>
              <Status status={data?.status || 'NOT_CHECKED_IN'} />
            </div>
            <div className="time-grid">
              <div>
                <span className="attendance-step">
                  {record ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  <span>1 · Check-in</span>
                </span>
                <strong>{time(record?.checkInAt)}</strong>
                <small>{record ? 'Recorded' : 'Next step'}</small>
                {record?.isLate && (
                  <small className="timing-indicator">
                    Late check-in · after 08:00 {zoneLabel()}
                  </small>
                )}
              </div>
              <div>
                <span className="attendance-step">
                  {record?.checkOutAt ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  <span>2 · Check-out</span>
                </span>
                <strong>{time(record?.checkOutAt)}</strong>
                <small>
                  {record?.checkOutAt
                    ? 'Recorded'
                    : record
                      ? 'Next step'
                      : 'Available after check-in'}
                </small>
                {record?.isEarlyCheckout && (
                  <small className="timing-indicator">
                    Early check-out · before 17:00 {zoneLabel()}
                  </small>
                )}
              </div>
            </div>
            {data?.status !== 'COMPLETE' && (
              <Button onClick={() => setAction(record ? 'check-out' : 'check-in')}>
                {record ? 'Check out now' : 'Check in now'} <ArrowRight size={17} />
              </Button>
            )}
            <div className="work-duration-strip" aria-label="Today's total work time">
              <Clock3 size={20} />
              <div>
                <span>Total work time</span>
                <strong>{formatDuration(record?.workedSeconds)}</strong>
              </div>
              <small>
                {record?.checkOutAt
                  ? 'Check-out minus check-in · no break deduction'
                  : record
                    ? 'Finalized after check-out'
                    : 'Available after check-in and check-out'}
              </small>
            </div>
          </div>
          <section className="panel employee-profile">
            <div className="employee-section-title">
              <UserRound size={18} />
              <div>
                <h2>Your profile</h2>
                <p>Contact HR to update your employee information.</p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Full name</dt>
                <dd>{user?.employee?.fullName}</dd>
              </div>
              <div>
                <dt>Employee ID</dt>
                <dd>{user?.employee?.employeeNumber}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{user?.employee?.department}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user?.email}</dd>
              </div>
            </dl>
          </section>
          <div className="info-row">
            <div>
              <Clock3 size={20} />
              <div>
                <strong>Time recorded automatically</strong>
                <p>Attendance times use the server clock and are displayed in {zoneLabel()}.</p>
              </div>
            </div>
            <Link to="/employee/history">
              View history <ArrowRight size={16} />
            </Link>
          </div>
          {record && (
            <div className="section">
              <h2>Today's proof photos</h2>
              <div className="photo-grid">
                <Evidence url={record.checkInPhotoUrl} label="Check-in photo" />
                <Evidence url={record.checkOutPhotoUrl} label="Check-out photo" />
              </div>
            </div>
          )}
        </>
      )}
      {action && (
        <AttendanceAction
          kind={action}
          onClose={(message) => {
            setAction(null);
            if (message) setSuccess(message);
          }}
        />
      )}
    </Shell>
  );
}
