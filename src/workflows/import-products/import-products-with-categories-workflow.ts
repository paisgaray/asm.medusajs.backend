import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { batchProductsWorkflow } from '@medusajs/medusa/core-flows';

import { normalizeCsvToBatchRequestStep } from './steps/normalize-csv-to-batch-request-step';
import { normalizeCsvWithCategoriesStep } from './steps/normalize-csv-with-categories-step';

/**
 * Workflow customizado que substitui o normalizeCsvStep do importProductsWorkflow
 *
 * Este workflow:
 * 1. Normaliza o CSV com processamento de categorias (nosso step customizado)
 * 2. Converte o CSV normalizado para batchRequest (formato que batchProductsWorkflow espera)
 * 3. Executa batchProductsWorkflow para criar/atualizar produtos
 * 4. Envia notificações
 *
 * NOTA: Removemos o step de confirmação (waitConfirmationProductImportStep) porque
 * estamos usando uma rota customizada que executa o workflow diretamente.
 *
 * Seguindo a estrutura do importProductsWorkflow oficial:
 * - https://github.com/medusajs/medusa/blob/de08ea732b599374a071c016fa8af2e4f3e31075/packages/core/core-flows/src/product/workflows/import-products.ts
 */

type ImportProductsWithCategoriesInput = {
  fileContent: string; // CSV content (base64)
  filename: string;
  additional_data?: Record<string, unknown>;
};

export const importProductsWithCategoriesWorkflow = createWorkflow(
  'import-products-with-categories',
  (input: ImportProductsWithCategoriesInput) => {
    // Step 1: Normalizar CSV com processamento de categorias
    // Este step processa a coluna "Product Category" e cria categorias automaticamente
    const normalizedCsv = normalizeCsvWithCategoriesStep({
      fileContent: input.fileContent,
      filename: input.filename,
    });

    // Step 2: Converter CSV normalizado para batchRequest (formato que batchProductsWorkflow espera)
    const batchRequest = normalizeCsvToBatchRequestStep({
      fileContent: normalizedCsv.fileContent,
    });

    // Step 2.5: O categoryMapping será passado via cache (file-cache.ts)
    // O batchRequest não aceita additional_data diretamente

    // Step 3: Calcular summary (toCreate, toUpdate)
    const summary = transform({ batchRequest }, (data) => {
      return {
        toCreate: data.batchRequest.create.length,
        toUpdate: data.batchRequest.update.length,
      };
    });

    // Step 4: Executar batchProductsWorkflow para criar/atualizar produtos
    // O categoryMapping será recuperado via cache no hook productsCreated
    // NOTA: Removemos os steps de notificação porque requerem um provider de notificações
    // configurado para o canal "feed", que pode não estar disponível
    batchProductsWorkflow
      .runAsStep({ input: batchRequest })
      .config({ async: true, backgroundExecution: true });

    // Retornar summary (igual ao importProductsWorkflow oficial)
    return new WorkflowResponse(summary);
  },
);
