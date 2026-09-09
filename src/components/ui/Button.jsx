import { cn } from '@/core/utils/helpers.js';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  loading = false,
  disabled,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn('btn', `btn--${variant}`, `btn--${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Processando…' : children}
    </button>
  );
}
