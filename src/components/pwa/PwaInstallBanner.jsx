import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { usePwaInstall } from '@/hooks/usePwaInstall.js';
import { cn } from '@/core/utils/helpers.js';

/**
 * Botão permanente para baixar/instalar o PWA.
 */
export function PwaInstallButton({ variant = 'secondary', size = 'sm', className, label }) {
  const toast = useToast();
  const { canPrompt, installed, isIos, hintOpen, setHintOpen, install } = usePwaInstall();

  if (installed) {
    return (
      <Button variant="ghost" size={size} className={cn('pwa-download-btn', className)} disabled>
        App instalado
      </Button>
    );
  }

  async function handleClick() {
    const result = await install();
    if (result.via === 'prompt' && result.ok) {
      toast.success('Nexus Food instalado.');
    } else if (result.via === 'prompt' && !result.ok) {
      toast.info('Instalação cancelada.');
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn('pwa-download-btn', className)}
        onClick={handleClick}
        title="Baixar / instalar o aplicativo"
      >
        <Download size={16} />
        {label || (canPrompt ? 'Baixar app' : 'Baixar PWA')}
      </Button>

      <Modal open={hintOpen} onClose={() => setHintOpen(false)} title="Baixar o Nexus Food">
        <div className="pwa-hint">
          <p className="prose">
            Instale o app na tela inicial para abrir como aplicativo, com acesso rápido e cache
            offline dos arquivos.
          </p>

          {isIos ? (
            <ol className="pwa-hint__steps">
              <li>
                Toque em <Share size={14} className="inline-icon" /> <strong>Compartilhar</strong> no
                Safari
              </li>
              <li>
                Escolha <strong>Adicionar à Tela de Início</strong>
              </li>
              <li>
                Confirme em <strong>Adicionar</strong>
              </li>
            </ol>
          ) : (
            <ol className="pwa-hint__steps">
              <li>
                No Chrome/Edge, use o menu <strong>⋮</strong> ou o ícone de instalar na barra de
                endereço
              </li>
              <li>
                Toque em <strong>Instalar aplicativo</strong> / <strong>Instalar Nexus Food</strong>
              </li>
              <li>
                Em desenvolvimento, rode <code>npm run build && npm run preview</code> — o prompt
                nativo exige build de produção (ou HTTPS)
              </li>
            </ol>
          )}

          <div className="form-actions mt-3">
            <Button variant="secondary" onClick={() => setHintOpen(false)}>
              Entendi
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Banner inferior — aparece quando o navegador libera o prompt nativo */
export function PwaInstallBanner() {
  const toast = useToast();
  const { canPrompt, installed, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('nexus-food:pwa-dismiss') === '1');
  }, []);

  if (installed || dismissed || !canPrompt) return null;

  async function handleInstall() {
    const result = await install();
    if (result.ok) toast.success('Nexus Food instalado.');
    else toast.info('Instalação cancelada.');
  }

  function dismiss() {
    sessionStorage.setItem('nexus-food:pwa-dismiss', '1');
    setDismissed(true);
  }

  return (
    <div className="pwa-banner" role="region" aria-label="Baixar aplicativo">
      <div className="pwa-banner__text">
        <Download size={18} aria-hidden />
        <span>Baixe o Nexus Food e use como aplicativo no celular ou PC.</span>
      </div>
      <div className="pwa-banner__actions">
        <Button size="sm" onClick={handleInstall}>
          <Download size={14} /> Baixar
        </Button>
        <button type="button" className="pwa-banner__close" onClick={dismiss} aria-label="Fechar">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
