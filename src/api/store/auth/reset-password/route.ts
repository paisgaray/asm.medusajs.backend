/**
 * API Route: Request Password Reset
 * 
 * Esta rota utiliza o workflow generateResetPasswordTokenWorkflow diretamente,
 * garantindo que o evento auth.password_reset seja emitido corretamente.
 * 
 * POST /store/auth/reset-password
 * Body: { email: string }
 * 
 * IMPORTANTE: O workflow só funciona se o email tiver uma identidade de autenticação
 * vinculada ao provider 'emailpass'. Isso significa que o customer deve ter sido criado
 * através do fluxo de registro (/auth/customer/emailpass/register) ou ter uma auth_identity
 * criada manualmente.
 * 
 * O workflow:
 * - Valida se existe uma identidade de autenticação para o email
 * - Gera token JWT
 * - Emite evento auth.password_reset automaticamente após conclusão bem-sucedida
 * 
 * Referência: https://docs.medusajs.com/resources/references/medusa-workflows/generateResetPasswordTokenWorkflow
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { generateResetPasswordTokenWorkflow } from '@medusajs/medusa/core-flows';

interface ResetPasswordRequest {
  email: string;
}

export async function POST(req: MedusaRequest<ResetPasswordRequest>, res: MedusaResponse) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email is required',
      message: 'Por favor, forneça um endereço de email',
    });
  }

  try {
    // Resolver o configModule para obter o jwtSecret
    const config = req.scope.resolve('configModule');
    const jwtSecret = config.projectConfig.http.jwtSecret;

    if (!jwtSecret) {
      console.error('[Password Reset] ❌ JWT_SECRET não configurado no medusa-config.ts');
      // Continua mesmo assim, mas o workflow pode falhar
    }

    // Executa o workflow nativo que gera o token e emite o evento
    // O workflow só completa com sucesso se existir uma auth_identity para o email
    // IMPORTANTE: É necessário passar o secret explicitamente para gerar o token JWT
    console.log('[Password Reset] Executando workflow generateResetPasswordTokenWorkflow');
    console.log('[Password Reset] Input:', { 
      entityId: email, 
      actorType: 'customer', 
      provider: 'emailpass',
      secret: jwtSecret ? '***configurado***' : 'NÃO CONFIGURADO',
    });

    await generateResetPasswordTokenWorkflow(req.scope).run({
      input: {
        entityId: email,
        actorType: 'customer',
        provider: 'emailpass',
        secret: jwtSecret, // ✅ CRÍTICO: Secret necessário para gerar o token JWT
      },
    });

    console.log('[Password Reset] ✅ Workflow executado com sucesso');
    console.log('[Password Reset] ⏳ Evento auth.password_reset deve ser emitido e capturado pelo subscriber...');
  } catch (error: unknown) {
    // Logamos o erro internamente para debug
    // IMPORTANTE: Não revelamos o erro ao cliente para evitar user enumeration
    // O erro pode ser:
    // - "Provider identity not found" (email não tem senha cadastrada)
    // - Email não existe
    // - Outros erros de validação
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Password Reset] Erro silencioso: ${errorMessage}`);
    
    // Log detalhado apenas em desenvolvimento para debug
    if (process.env.NODE_ENV === 'development') {
      if (error instanceof Error) {
        console.error('[Password Reset] Stack:', error.stack);
      } else if (error && typeof error === 'object') {
        console.error('[Password Reset] Erro detalhado:', JSON.stringify(error, null, 2));
      }
    }
    
    // Não relançamos o erro para o cliente (segurança)
  }

  // Sempre retornamos 200 para o cliente por segurança
  // Não revelamos se o email existe ou não (evita user enumeration)
  return res.status(200).json({
    success: true,
    message: 'Se o email existir, você receberá instruções para redefinir sua senha',
  });
}
