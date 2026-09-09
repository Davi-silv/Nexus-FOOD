import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, login, register, loadStoredSession } from '@/services/auth.service.js';
import { findAuthUserByEmail } from '@/services/users.service.js';
import { getCompanyProfile } from '@/services/settings.service.js';
import { listPlatformCompanies, resetPlatformDemo } from '@/services/platform.service.js';
import { ROLES } from '@/config/roles.config.js';

describe('auth.register', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    resetPlatformDemo();
  });

  it('cria empresa + admin e inicia sessão', async () => {
    const result = await register({
      ownerName: 'João Silva',
      email: 'joao@novaburger.local',
      password: 'senha123',
      passwordConfirm: 'senha123',
      tradeName: 'Nova Burger',
      name: 'Nova Burger Ltda',
      segment: 'hamburgueria',
      planSlug: 'pro',
    });

    expect(result.user.email).toBe('joao@novaburger.local');
    expect(result.user.role).toBe(ROLES.COMPANY_ADMIN);
    expect(result.user.password).toBeUndefined();
    expect(result.company.tradeName).toBe('Nova Burger');
    expect(result.company.planSlug).toBe('pro');
    expect(result.company.id).toBeTruthy();

    const stored = findAuthUserByEmail('joao@novaburger.local');
    expect(stored.companyId).toBe(result.company.id);
    expect(getCompanyProfile(result.company.id).tradeName).toBe('Nova Burger');
    expect(listPlatformCompanies().some((c) => c.id === result.company.id)).toBe(true);

    clearSession();
    const again = await login({ email: 'joao@novaburger.local', password: 'senha123' });
    expect(again.company.id).toBe(result.company.id);
  });

  it('rejeita e-mail duplicado e senhas diferentes', async () => {
    await register({
      ownerName: 'Ana',
      email: 'ana@teste.local',
      password: 'senha123',
      passwordConfirm: 'senha123',
      tradeName: 'Ana Lanches',
      name: 'Ana Lanches',
      segment: 'lanchonete',
    });

    await expect(
      register({
        ownerName: 'Outra',
        email: 'ana@teste.local',
        password: 'senha123',
        passwordConfirm: 'senha123',
        tradeName: 'Outra',
        name: 'Outra',
        segment: 'lanchonete',
      }),
    ).rejects.toThrow(/e-mail/i);

    await expect(
      register({
        ownerName: 'Bruno',
        email: 'bruno@teste.local',
        password: 'senha123',
        passwordConfirm: 'outra',
        tradeName: 'Bruno',
        name: 'Bruno',
        segment: 'pizzaria',
      }),
    ).rejects.toThrow();
  });

  it('sessão reidrata após cadastro', async () => {
    await register({
      ownerName: 'Carla',
      email: 'carla@pizza.local',
      password: 'senha123',
      passwordConfirm: 'senha123',
      tradeName: 'Carla Pizza',
      name: 'Carla Pizza',
      segment: 'pizzaria',
      planSlug: 'start',
    });
    const session = loadStoredSession();
    expect(session.user.email).toBe('carla@pizza.local');
    expect(session.company.tradeName).toBe('Carla Pizza');
  });
});
