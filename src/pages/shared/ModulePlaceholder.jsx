import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';

/**
 * Placeholder modular para módulos ainda não implementados nas fases seguintes.
 */
export function ModulePlaceholder({
  title,
  subtitle,
  description,
  phaseHint,
}) {
  const toast = useToast();

  return (
    <AppShell title={title} subtitle={subtitle}>
      <Card>
        <CardHeader title={title} subtitle={phaseHint} />
        <EmptyState
          title="Módulo estruturado — implementação incremental"
          description={description}
          action={
            <Button
              variant="secondary"
              onClick={() => toast.info('Este módulo será liberado na próxima fase.')}
            >
              Entendi
            </Button>
          }
        />
      </Card>
    </AppShell>
  );
}
