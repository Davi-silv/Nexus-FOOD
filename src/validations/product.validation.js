/**
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, data: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateProduct(input) {
  const errors = {};

  const name = String(input.name ?? '').trim();
  if (!name) errors.name = 'Informe o nome do produto.';
  else if (name.length < 2) errors.name = 'Nome deve ter ao menos 2 caracteres.';
  else if (name.length > 120) errors.name = 'Nome muito longo.';

  const category = String(input.category ?? '').trim();
  if (!category) errors.category = 'Selecione ou informe a categoria.';
  else if (category.length > 80) errors.category = 'Categoria muito longa.';

  const description = String(input.description ?? '').trim();
  if (description.length > 500) errors.description = 'Descrição muito longa (máx. 500).';

  const salePrice = Number(input.salePrice);
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    errors.salePrice = 'Preço de venda deve ser zero ou maior.';
  }

  let imageUrl = String(input.imageUrl ?? '').trim() || null;
  if (imageUrl) {
    const lower = imageUrl.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:')
    ) {
      errors.imageUrl = 'URL da imagem não permitida.';
    } else {
      try {
        const u = new URL(imageUrl);
        if (!['http:', 'https:'].includes(u.protocol)) {
          errors.imageUrl = 'URL da imagem deve começar com http:// ou https://.';
        }
      } catch {
        errors.imageUrl = 'URL da imagem inválida.';
      }
    }
  }

  const available = Boolean(input.available);
  const status = input.status === 'inactive' ? 'inactive' : 'active';

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      category,
      description: description || null,
      salePrice,
      imageUrl,
      available,
      status,
    },
  };
}
