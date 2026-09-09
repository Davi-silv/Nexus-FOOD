import { cn } from '@/core/utils/helpers.js';

export function Card({ children, className, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="card__header">
      <div>
        {title ? <h3 className="card__title">{title}</h3> : null}
        {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
