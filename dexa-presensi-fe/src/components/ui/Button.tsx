export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <button {...props} className={`btn btn-${variant} ${props.className || ''}`}>
      {children}
    </button>
  );
}
