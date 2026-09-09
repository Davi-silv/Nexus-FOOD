import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_MODULES,
  ROLES,
} from '@/config/roles.config.js';
import {
  createCompanyUser,
  deactivateCompanyUser,
  listCompanyUsers,
  PERMISSION_LABELS,
  updateCompanyUser,
} from '@/services/users.service.js';

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: ROLES.EMPLOYEE,
  permissions: { ...DEFAULT_EMPLOYEE_PERMISSIONS },
  active: true,
};

export function UsersPage() {
  const { company, user: me } = useAuth();
  const toast = useToast();
  const companyId = company?.id;

  const [tick, setTick] = useState(0);
  const users = useMemo(() => (companyId ? listCompanyUsers(companyId) : []), [companyId, tick]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setValues({ ...EMPTY, permissions: { ...DEFAULT_EMPLOYEE_PERMISSIONS } });
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    setValues({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role,
      permissions: { ...DEFAULT_EMPLOYEE_PERMISSIONS, ...(u.permissions || {}) },
      active: u.active !== false,
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  function togglePerm(mod) {
    setValues((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [mod]: !prev.permissions[mod] },
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      if (editing) {
        updateCompanyUser(companyId, editing.id, {
          name: values.name,
          email: values.email,
          password: values.password || undefined,
          role: values.role,
          permissions: values.permissions,
          active: values.active,
        });
        toast.success('Usuário atualizado.');
      } else {
        createCompanyUser(companyId, values);
        toast.success('Usuário criado.');
      }
      setModalOpen(false);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeactivate(u) {
    if (u.id === me?.id) {
      toast.error('Você não pode desativar a si mesmo.');
      return;
    }
    try {
      deactivateCompanyUser(companyId, u.id);
      toast.success('Usuário desativado.');
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message || 'Falha ao desativar.');
    }
  }

  const activeCount = users.filter((u) => u.active !== false).length;

  return (
    <AppShell title="Usuários" subtitle="Admin e funcionários com permissões por módulo">
      <Card>
        <CardHeader
          title="Equipe"
          subtitle={`${activeCount} ativos · ${company?.tradeName || ''}`}
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo usuário
            </Button>
          }
        />
        {users.length === 0 ? (
          <EmptyState title="Nenhum usuário" description="Cadastre o primeiro funcionário." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Permissões</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.active === false ? 'is-muted' : ''}>
                    <td>
                      <strong>{u.name}</strong>
                      {u.id === me?.id ? <span className="muted"> · você</span> : null}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <Badge tone={u.role === ROLES.COMPANY_ADMIN ? 'info' : 'neutral'}>
                        {u.role === ROLES.COMPANY_ADMIN ? 'Admin' : 'Funcionário'}
                      </Badge>
                    </td>
                    <td className="muted">
                      {u.role === ROLES.COMPANY_ADMIN
                        ? 'Acesso total'
                        : PERMISSION_MODULES.filter((m) => u.permissions?.[m])
                            .map((m) => PERMISSION_LABELS[m])
                            .slice(0, 4)
                            .join(', ') || 'Nenhuma'}
                    </td>
                    <td>
                      <Badge tone={u.active === false ? 'danger' : 'success'}>
                        {u.active === false ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </td>
                    <td className="row-actions">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} aria-label="Editar">
                        <Pencil size={16} />
                      </Button>
                      {u.active !== false && u.id !== me?.id ? (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u)}>
                          Desativar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
      >
        <form className="form-grid" onSubmit={handleSave}>
          <label className="form-field">
            <span>Nome</span>
            <input
              className="input"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              required
            />
            {fieldErrors.name ? <em className="field-error">{fieldErrors.name}</em> : null}
          </label>
          <label className="form-field">
            <span>E-mail</span>
            <input
              className="input"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              required
            />
            {fieldErrors.email ? <em className="field-error">{fieldErrors.email}</em> : null}
          </label>
          <label className="form-field">
            <span>{editing ? 'Nova senha (opcional)' : 'Senha'}</span>
            <input
              className="input"
              type="password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              required={!editing}
              autoComplete="new-password"
            />
            {fieldErrors.password ? <em className="field-error">{fieldErrors.password}</em> : null}
          </label>
          <label className="form-field">
            <span>Papel</span>
            <select
              className="input"
              value={values.role}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
            >
              <option value={ROLES.EMPLOYEE}>Funcionário</option>
              <option value={ROLES.COMPANY_ADMIN}>Admin do restaurante</option>
            </select>
          </label>

          {values.role === ROLES.EMPLOYEE ? (
            <div className="span-2">
              <p className="muted" style={{ marginBottom: '0.5rem' }}>
                Permissões do funcionário — financeiro e relatórios só com marcação explícita.
              </p>
              <div className="perm-grid">
                {PERMISSION_MODULES.map((mod) => (
                  <label key={mod} className="perm-check">
                    <input
                      type="checkbox"
                      checked={Boolean(values.permissions[mod])}
                      onChange={() => togglePerm(mod)}
                    />
                    <span>{PERMISSION_LABELS[mod]}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="span-2 muted">Administradores têm acesso a todos os módulos.</p>
          )}

          {editing ? (
            <label className="form-field span-2 perm-check">
              <input
                type="checkbox"
                checked={values.active}
                onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
              />
              <span>Usuário ativo</span>
            </label>
          ) : null}

          <div className="span-2 form-actions">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
