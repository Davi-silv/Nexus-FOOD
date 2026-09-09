import { formatMoney } from '@/core/utils/money.js';
import { cn } from '@/core/utils/helpers.js';

export function KpiCard({ label, value, hint, tone = 'neutral', money = false }) {
  const display = money ? formatMoney(value) : value;
  return (
    <article className={cn('card', 'kpi-card', `kpi-card--${tone}`)}>
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{display}</p>
      {hint ? <p className="kpi-card__hint">{hint}</p> : null}
    </article>
  );
}
