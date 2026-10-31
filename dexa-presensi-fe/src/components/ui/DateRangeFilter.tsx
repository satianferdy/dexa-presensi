import { CalendarDays } from 'lucide-react';
import { date } from '../../lib/date';
export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="date-filter">
      <span className="filter-label">Date range</span>
      <details className="date-range">
        <summary>
          <CalendarDays size={17} />
          <span>
            {date(from)} – {date(to)}
          </span>
        </summary>
        <div className="date-range-popover">
          <label>
            From date
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => onChange('from', e.target.value)}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => onChange('to', e.target.value)}
            />
          </label>
        </div>
      </details>
    </div>
  );
}
