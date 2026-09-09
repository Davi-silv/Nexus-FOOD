/**
 * @param {Record<string, unknown>} input
 */
export function validateSupplier(input) {
  const errors = {};

  const name = String(input.name ?? '').trim();
  if (!name) errors.name = 'Informe o nome / razão social.';
  else if (name.length < 2) errors.name = 'Nome muito curto.';
  else if (name.length > 160) errors.name = 'Nome muito longo.';

  const document = String(input.document ?? '').trim() || null;
  if (document && document.replace(/\D/g, '').length < 11) {
    errors.document = 'CNPJ/CPF inválido.';
  }

  const email = String(input.email ?? '').trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'E-mail inválido.';
  }

  const phone = String(input.phone ?? '').trim() || null;
  const whatsapp = String(input.whatsapp ?? '').trim() || null;
  const contactName = String(input.contactName ?? '').trim() || null;
  const notes = String(input.notes ?? '').trim() || null;
  if (notes && notes.length > 1000) errors.notes = 'Observações muito longas.';

  const status = input.status === 'inactive' ? 'inactive' : 'active';
  const ingredientIds = Array.isArray(input.ingredientIds)
    ? [...new Set(input.ingredientIds.filter(Boolean).map(String))]
    : [];

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      document,
      email,
      phone,
      whatsapp,
      contactName,
      notes,
      status,
      ingredientIds,
    },
  };
}
