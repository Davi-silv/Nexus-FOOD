import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { APP_CONFIG } from '@/config/app.config.js';
import { ADMIN_NAV, RESTAURANT_NAV } from '@/config/navigation.config.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { cn } from '@/core/utils/helpers.js';
import { resolveCompanyBrand } from '@/services/branding.service.js';

export function AppShell({ children, title, subtitle }) {
  const { user, company, logout, isPlatformAdmin, canAccess } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = isPlatformAdmin
    ? ADMIN_NAV
    : RESTAURANT_NAV.filter((item) => canAccess(item.permission));

  const brand = resolveCompanyBrand(isPlatformAdmin ? null : company);
  const displayName = !isPlatformAdmin
    ? company?.tradeName || company?.name || APP_CONFIG.name
    : APP_CONFIG.name;
  const displayOwner = !isPlatformAdmin
    ? brand.brandTagline || APP_CONFIG.name
    : APP_CONFIG.brand;

  async function handleLogout() {
    await logout();
    toast.info('Sessão encerrada.');
    navigate('/login');
  }

  return (
    <div className="shell">
      <div
        className={cn('sidebar-overlay', open && 'is-active')}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside className={cn('sidebar', open && 'is-open')}>
        <div className="sidebar__brand">
          {brand.logoUrl && !isPlatformAdmin ? (
            <img src={brand.logoUrl} alt="" className="brand-logo" />
          ) : (
            <div className="brand-mark" aria-hidden="true" />
          )}
          <div>
            <p className="brand-name">{displayName}</p>
            <p className="brand-owner">{displayOwner}</p>
          </div>
          <button type="button" className="sidebar__close" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {!isPlatformAdmin && company ? (
          <div className="sidebar__company">
            <span className="sidebar__company-label">Empresa</span>
            <strong>{company.tradeName || company.name}</strong>
          </div>
        ) : null}

        <nav className="sidebar__nav" aria-label="Menu principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === '/' || item.path === '/admin'}
                className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <button type="button" className="topbar__menu" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="topbar__titles">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
