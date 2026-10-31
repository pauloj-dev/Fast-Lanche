import { getProductImagePath } from '../services/menuService.js';

// Todas as ilustracoes de assets/products resolvidas pelo Vite (funciona em /react/ e no dist/).
const productImages = import.meta.glob('../../assets/products/*.svg', { eager: true, query: '?url', import: 'default' });
const fallback = productImages['../../assets/products/hamburguer.svg'];

export function getProductImageUrl(item) {
  return productImages[`../../${getProductImagePath(item)}`] || fallback;
}

// Ilustracao decorativa: o nome do produto ja aparece em texto ao lado.
export function ProductImage({ item, className, loading = 'lazy' }) {
  return <img className={className} src={getProductImageUrl(item)} alt="" loading={loading} decoding="async"/>;
}
