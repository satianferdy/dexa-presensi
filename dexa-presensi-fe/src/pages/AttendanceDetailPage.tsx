import { useBusinessDate } from '../lib/use-business-date';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { date, time, zoneLabel } from '../lib/date';
import { Attendance } from '../lib/types';
import { Notice } from '../components/ui/Notice';
import { Busy } from '../components/ui/Busy';
import { Status } from '../components/ui/Status';
import { Shell } from '../components/layout/Shell';
import { PageHead } from '../components/layout/PageHead';
import { Evidence } from '../features/attendance/Evidence';
import { formatDuration } from '../lib/duration';

export function AttendanceDetail({ hrd = false }: { hrd?: boolean }) {
  const businessDate = useBusinessDate();
  const location = useLocation();
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance', 'detail', businessDate, id],
    queryFn: async () => (await api.get<Attendance>(`/attendance/${id}`)).data,
    enabled: !!id,
  });
  return (
    <Shell>
      <Link
        className="back-link"
        to={location.state?.returnTo || (hrd ? '/hrd/attendance' : '/employee/history')}
      >
        <ArrowLeft size={17} /> Back
      </Link>
      {isLoading ? (
        <Busy />
      ) : error ? (
        <Notice>{errorMessage(error)}</Notice>
      ) : (
        data && (
          <>
            <PageHead
              eyebrow="ATTENDANCE DETAILS"
              title={hrd ? data.employee?.fullName || 'Attendance details' : date(data.workDate)}
              description={
                hrd
                  ? `${date(data.workDate)} · ${data.employee?.department || ''}`
                  : 'Your WFH attendance record.'
              }
              action={<Status status={data.status} />}
            />
            <div className="panel work-duration-strip">
              <div>
                <span>Total work time</span>
                <strong>{formatDuration(data.workedSeconds)}</strong>
              </div>
              <small>
                {data.checkOutAt
                  ? 'Elapsed time from check-in to check-out. No break deduction.'
                  : data.status === 'INCOMPLETE'
                    ? 'Check-out was not recorded before the business date changed. This record is excluded from work totals.'
                    : 'Awaiting check-out. This record is excluded from completed work totals.'}
              </small>
            </div>
            <div className="detail-grid">
              <div className="panel">
                <h2>Check-in</h2>
                <div className="big-time">{time(data.checkInAt)}</div>
                <p>
                  {data.isLate
                    ? `After the 08:00 ${zoneLabel()} target`
                    : `Target: 08:00 ${zoneLabel()}`}
                </p>
                <p>Note: {data.checkInNote || '—'}</p>
                <Evidence url={data.checkInPhotoUrl} label="Check-in proof photo" />
              </div>
              <div className="panel">
                <h2>Check-out</h2>
                <div className="big-time">{time(data.checkOutAt)}</div>
                <p>
                  {data.isEarlyCheckout
                    ? `Before the 17:00 ${zoneLabel()} target`
                    : data.status === 'INCOMPLETE'
                      ? 'Check-out not recorded'
                      : `Target: 17:00 ${zoneLabel()}`}
                </p>
                <p>Note: {data.checkOutNote || '—'}</p>
                <Evidence url={data.checkOutPhotoUrl} label="Check-out proof photo" />
              </div>
            </div>
          </>
        )
      )}
    </Shell>
  );
}
