import { cn } from '@/core/utils/helpers.js';

export function EmptyState({ title, description, action, className }) {
  return (
    <div className={cn('empty-state', className)}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
