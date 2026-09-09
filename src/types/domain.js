/**
 * @typedef {'platform_super_admin' | 'company_admin' | 'employee'} UserRole
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {UserRole} role
 * @property {string|null} companyId
 * @property {Record<string, boolean>} [permissions]
 */

/**
 * @typedef {Object} Company
 * @property {string} id
 * @property {string} name
 * @property {string} [tradeName]
 * @property {string} [document]
 * @property {string} [segment]
 * @property {string} planSlug
 * @property {'active'|'trial'|'suspended'|'past_due'} status
 * @property {number} [idealCmv]
 */

/**
 * @typedef {Object} Ingredient
 * @property {string} id
 * @property {string} companyId
 * @property {string} name
 * @property {string} [category]
 * @property {string} unit
 * @property {number} quantity
 * @property {number} minStock
 * @property {number} currentCost
 * @property {string|null} [supplierId]
 * @property {string|null} [lastPurchaseAt]
 * @property {'active'|'inactive'} status
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} companyId
 * @property {string} name
 * @property {string} [category]
 * @property {string} [description]
 * @property {number} salePrice
 * @property {string|null} [imageUrl]
 * @property {boolean} available
 * @property {'active'|'inactive'} status
 */

/**
 * @typedef {Object} RecipeItem
 * @property {string} ingredientId
 * @property {number} quantity
 * @property {string} unit
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} companyId
 * @property {string} productId
 * @property {RecipeItem[]} items
 * @property {number} totalCost
 * @property {number} marginPercent
 * @property {number} markup
 * @property {number} cmvPercent
 */

export {};
