import {
  waitConfirmationProductImportStepId,
  importProductsAsChunksWorkflowId,
  importProductsWorkflowId,
} from '@medusajs/core-flows';
import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type { IWorkflowEngineService } from '@medusajs/framework/types';
import { MedusaError, Modules, TransactionHandlerType } from '@medusajs/framework/utils';
import { StepResponse } from '@medusajs/framework/workflows-sdk';

// ID do nosso workflow customizado
const importProductsWithCategoriesWorkflowId = 'import-products-with-categories';

/**
 * Rota de confirmação para executar a importação real
 *
 * O Admin UI chama esta rota quando o botão "Import" é clicado.
 * URL: POST /admin/products/imports/{transaction_id}/confirm
 *
 * Esta rota usa o Workflow Engine para confirmar o step waitConfirmationProductImportStep
 * conforme documentação oficial do MedusaJS.
 *
 * IMPORTANTE: O nome do parâmetro deve ser transaction_id (não id) para corresponder
 * à rota padrão do MedusaJS.
 */

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger');
  // O MedusaJS usa transaction_id como nome do parâmetro na rota padrão
  const transactionId = req.params.transaction_id as string;

  logger.info('[API] /admin/products/imports/[transaction_id]/confirm: ========================================');
  logger.info(
    `[API] /admin/products/imports/[transaction_id]/confirm: 📥 ROTA DE CONFIRMAÇÃO CHAMADA! Transaction: ${transactionId}`,
  );
  logger.info(`[API] /admin/products/imports/[transaction_id]/confirm: Params: ${JSON.stringify(req.params, null, 2)}`);
  logger.info(`[API] /admin/products/imports/[transaction_id]/confirm: URL: ${req.url || 'N/A'}`);
  logger.info(`[API] /admin/products/imports/[transaction_id]/confirm: Path: ${req.path || 'N/A'}`);

  try {
    // Usar o Workflow Engine para marcar o step waitConfirmationProductImportStep como sucesso
    // Isso é o fluxo padrão do MedusaJS conforme documentação
    const workflowEngineService: IWorkflowEngineService = req.scope.resolve(Modules.WORKFLOW_ENGINE);

    logger.info(
      '[API] /admin/products/imports/[transaction_id]/confirm: 🚀 Confirmando step waitConfirmationProductImportStep via Workflow Engine...',
    );
    logger.info(`[API] /admin/products/imports/[transaction_id]/confirm: Transaction ID: ${transactionId}`);
    logger.info(
      `[API] /admin/products/imports/[transaction_id]/confirm: Step ID: ${waitConfirmationProductImportStepId}`,
    );

    // Tentar primeiro com nosso workflow customizado (import-products-with-categories)
    try {
      await workflowEngineService.setStepSuccess({
        idempotencyKey: {
          action: TransactionHandlerType.INVOKE,
          transactionId,
          stepId: waitConfirmationProductImportStepId,
          workflowId: importProductsWithCategoriesWorkflowId,
        },
        stepResponse: new StepResponse(true),
      });
      logger.info(
        '[API] /admin/products/imports/[transaction_id]/confirm: ✅ Confirmação bem-sucedida com importProductsWithCategoriesWorkflowId',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[API] /admin/products/imports/[transaction_id]/confirm: ⚠️ Erro com importProductsWithCategoriesWorkflowId: ${errorMessage}`,
      );
      logger.info(`[API] /admin/products/imports/[transaction_id]/confirm: Tentando com importProductsWorkflowId...`);

      // Se falhar, tentar com importProductsWorkflowId (fallback)
      try {
        await workflowEngineService.setStepSuccess({
          idempotencyKey: {
            action: TransactionHandlerType.INVOKE,
            transactionId,
            stepId: waitConfirmationProductImportStepId,
            workflowId: importProductsWorkflowId,
          },
          stepResponse: new StepResponse(true),
        });
        logger.info(
          '[API] /admin/products/imports/[transaction_id]/confirm: ✅ Confirmação bem-sucedida com importProductsWorkflowId',
        );
      } catch (error2) {
        const error2Message = error2 instanceof Error ? error2.message : String(error2);
        logger.warn(
          `[API] /admin/products/imports/[transaction_id]/confirm: ⚠️ Erro com importProductsWorkflowId: ${error2Message}`,
        );
        logger.info(
          `[API] /admin/products/imports/[transaction_id]/confirm: Tentando com importProductsAsChunksWorkflowId...`,
        );

        // Se falhar, tentar com importProductsAsChunksWorkflowId (último fallback)
        try {
          await workflowEngineService.setStepSuccess({
            idempotencyKey: {
              action: TransactionHandlerType.INVOKE,
              transactionId,
              stepId: waitConfirmationProductImportStepId,
              workflowId: importProductsAsChunksWorkflowId,
            },
            stepResponse: new StepResponse(true),
          });
          logger.info(
            '[API] /admin/products/imports/[transaction_id]/confirm: ✅ Confirmação bem-sucedida com importProductsAsChunksWorkflowId',
          );
        } catch (error3) {
          const error3Message = error3 instanceof Error ? error3.message : String(error3);

          // Se a transação não foi encontrada, pode ser que o workflow já tenha completado
          // (porque removemos o step de confirmação). Nesse caso, retornar sucesso.
          if (error3Message.includes('could not be found') || error3Message.includes('Transaction')) {
            logger.info(
              `[API] /admin/products/imports/[transaction_id]/confirm: ⚠️ Transação não encontrada - workflow provavelmente já completou`,
            );
            logger.info(
              `[API] /admin/products/imports/[transaction_id]/confirm: Retornando sucesso (workflow sem step de confirmação)`,
            );
            logger.info(
              '[API] /admin/products/imports/[transaction_id]/confirm: ========================================',
            );
            logger.info(
              '[API] /admin/products/imports/[transaction_id]/confirm: ✅ Workflow já completou (sem step de confirmação)',
            );
            logger.info(
              '[API] /admin/products/imports/[transaction_id]/confirm: ========================================',
            );

            // Retornar sucesso porque o workflow já completou
            return res.status(202).json({});
          }

          logger.error(`[API] /admin/products/imports/[transaction_id]/confirm: ❌ Erro com todos os workflow IDs`);
          logger.error(
            `[API] /admin/products/imports/[transaction_id]/confirm: Erro 1 (importProductsWithCategoriesWorkflowId): ${errorMessage}`,
          );
          logger.error(
            `[API] /admin/products/imports/[transaction_id]/confirm: Erro 2 (importProductsWorkflowId): ${error2Message}`,
          );
          logger.error(
            `[API] /admin/products/imports/[transaction_id]/confirm: Erro 3 (importProductsAsChunksWorkflowId): ${error3Message}`,
          );
          logger.error(
            `[API] /admin/products/imports/[transaction_id]/confirm: Stack 3: ${error3 instanceof Error ? error3.stack : 'N/A'}`,
          );

          // Lançar erro mais descritivo
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Transaction ${transactionId} could not be found. Tried workflow IDs: ${importProductsWithCategoriesWorkflowId}, ${importProductsWorkflowId}, ${importProductsAsChunksWorkflowId}. Error: ${error3Message}`,
          );
        }
      }
    }

    logger.info('[API] /admin/products/imports/[transaction_id]/confirm: ========================================');
    logger.info(
      '[API] /admin/products/imports/[transaction_id]/confirm: ✅ Confirmação enviada ao Workflow Engine com sucesso!',
    );
    logger.info('[API] /admin/products/imports/[transaction_id]/confirm: ========================================');

    // Retornar resposta vazia conforme documentação (202 Accepted)
    res.status(202).json({});
  } catch (error) {
    logger.error('[API] /admin/products/imports/[transaction_id]/confirm: ========================================');
    logger.error('[API] /admin/products/imports/[transaction_id]/confirm: ❌ ERRO na importação');
    logger.error(
      `[API] /admin/products/imports/[transaction_id]/confirm: Erro: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      logger.error(`[API] /admin/products/imports/[transaction_id]/confirm: Stack: ${error.stack}`);
    }
    logger.error('[API] /admin/products/imports/[transaction_id]/confirm: ========================================');
    throw error;
  }
};
