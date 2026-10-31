import { Button } from './Button';

export function Pager({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {total} records · Page {page} of {Math.max(1, Math.ceil(total / limit))}
      </span>
      <div>
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
