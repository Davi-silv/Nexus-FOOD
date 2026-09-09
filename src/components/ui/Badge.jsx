import { cn } from '@/core/utils/helpers.js';

const TONE_MAP = {
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral',
};

export function Badge({ children, tone = 'neutral', className }) {
  return <span className={cn('badge', TONE_MAP[tone], className)}>{children}</span>;
}
