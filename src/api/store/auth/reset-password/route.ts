/**
 * API Route: Request Password Reset
 * Endpoint para solicitar redefinição de senha
 * 
 * POST /store/auth/reset-password
 * Body: { email: string }
 * 
 * Este endpoint:
 * 1. Valida se o email existe
 * 2. Gera token de reset (via Auth Module)
 * 3. Dispara evento para enviar email AUTOMATICAMENTE
 * 
 * Referência: https://docs.medusajs.com/resources/infrastructure-modules/auth
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import { generateResetPasswordToken } from '@medusajs/framework/utils';

interface ResetPasswordRequest {
  email: string;
}

export async function POST(
  req: MedusaRequest<ResetPasswordRequest>,
  res: MedusaResponse,
) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        message: 'Por favor, forneça um endereço de email',
      });
    }

    console.log(`[Reset Password] Solicitação recebida para email: ${email}`);

    // Resolver serviços necessários
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const authModuleService = req.scope.resolve(Modules.AUTH);
    const eventBusService = req.scope.resolve(Modules.EVENT_BUS);

    // 1. Verificar se o email existe
    const customers = await customerModuleService.listCustomers({
      email,
    });

    if (!customers || customers.length === 0) {
      // Por segurança, não revelamos se o email existe ou não
      console.log(`[Reset Password] Email não encontrado: ${email}`);
      
      // Retorna sucesso mesmo se email não existe (segurança)
      return res.status(200).json({
        success: true,
        message: 'Se o email existir, você receberá instruções para redefinir sua senha',
      });
    }

    const customer = customers[0];

    console.log(`[Reset Password] Cliente encontrado: ${customer.id}`);

    // 2. Gerar token de reset de senha
    const resetToken = generateResetPasswordToken({
      actorId: customer.id,
      provider: 'customer',
    });

    // 3. Armazenar token no Auth Module (expira em 1 hora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await authModuleService.create({
      provider: 'emailpass',
      entity_id: customer.id,
      scope: 'store',
      app_metadata: {
        reset_token: resetToken,
        reset_token_expires_at: expiresAt.toISOString(),
      },
    });

    console.log(`[Reset Password] Token gerado para cliente: ${customer.id}`);

    // 4. DISPARAR EVENTO AUTOMATICAMENTE
    await eventBusService.emit({
      name: 'user.password_reset_requested',
      data: {
        id: customer.id,
        email: customer.email,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      },
    });

    console.log(`[Reset Password] Evento disparado: user.password_reset_requested`);

    // 5. Retornar sucesso
    return res.status(200).json({
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir sua senha',
    });
  } catch (error) {
    console.error('[Reset Password] Erro:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Erro ao processar solicitação',
    });
  }
}
