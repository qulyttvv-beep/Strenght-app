// Open Food Facts (free, no key): barcode lookup + packaged-food search. Optional - the app works fully offline without it.
import { http } from './net.js';

const FIELDS = 'code,product_name,brands,nutriments,serving_size,serving_quantity';

function mapProduct(p) {
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
  if (kcal == null || !p.product_name) return null;
  const sq = parseFloat(p.serving_quantity);
  const serv = [];
  if (sq > 0) serv.push({ label: p.serving_size ? `1 serving (${p.serving_size})` : `1 serving (${Math.round(sq)} g)`, g: sq });
  serv.push({ label: '100 g', g: 100 });
  return {
    id: `off-${p.code}`, name: p.brands ? `${p.product_name} – ${String(p.brands).split(',')[0]}` : p.product_name,
    kcal, p: +n.proteins_100g || 0, c: +n.carbohydrates_100g || 0, f: +n.fat_100g || 0, serv, cat: 'packaged', barcode: p.code,
  };
}

export async function searchOpenFoodFacts(query, limit = 15) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=${FIELDS}`;
  const d = await http(url, { headers: { 'User-Agent': 'Forma/1.0 (personal fitness app)' }, timeout: 20000 });
  return (d.products || []).map(mapProduct).filter(Boolean);
}

export async function lookupBarcode(code) {
  const clean = String(code).replace(/\D/g, '');
  if (clean.length < 6) return null;
  const d = await http(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`, { headers: { 'User-Agent': 'Forma/1.0 (personal fitness app)' }, timeout: 20000 });
  return d.status === 1 && d.product ? mapProduct({ ...d.product, code: clean }) : null;
}
