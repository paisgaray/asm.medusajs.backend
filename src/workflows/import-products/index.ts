/**
 * Import Products with Categories
 *
 * Este módulo exporta o workflow customizado e garante que os hooks sejam registrados.
 *
 * O arquivo é carregado automaticamente pelo MedusaJS quando está em src/workflows/
 */

// Importar workflow customizado
export { importProductsWithCategoriesWorkflow } from './import-products-with-categories-workflow';

// Tentar registrar hooks (se disponíveis)
// NOTA: O MedusaJS v2.12.5 pode não expor hooks para normalizeCsvStep
// Se não funcionar, o workflow wrapper será usado via rota customizada
try {
  // Tentar todas as abordagens possíveis de hooks
  import('./hooks/register-normalize-csv-hook');
} catch (error) {
  // Ignorar se não conseguir carregar
  console.warn('[WORKFLOW] import-products: Erro ao carregar hooks:', error);
}
