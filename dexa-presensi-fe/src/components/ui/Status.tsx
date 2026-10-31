export function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {status === 'COMPLETE'
        ? 'Completed'
        : status === 'INCOMPLETE'
          ? 'Incomplete'
          : status === 'CHECKED_IN'
            ? 'Working'
            : status === 'NOT_CHECKED_IN'
              ? 'Not checked in'
              : status}
    </span>
  );
}
