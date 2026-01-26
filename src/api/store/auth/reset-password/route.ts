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
import crypto from 'crypto';

import { sendgridClient } from '../../../../utils/sendgrid-client';
import { SENDGRID_TEMPLATES } from '../../../../utils/sendgrid-templates';

interface ResetPasswordRequest {
  email: string;
}

export async function POST(req: MedusaRequest<ResetPasswordRequest>, res: MedusaResponse) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        message: 'Por favor, forneça um endereço de email',
      });
    }

    // Resolver serviços necessários
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // 1. Verificar se o email existe
    const customers = await customerModuleService.listCustomers({
      email,
    });

    if (!customers || customers.length === 0) {
      // Por segurança, não revelamos se o email existe ou não
      // Retorna sucesso mesmo se email não existe (segurança)
      return res.status(200).json({
        success: true,
        message: 'Se o email existir, você receberá instruções para redefinir sua senha',
      });
    }

    const customer = customers[0];

    // 2. Gerar token de reset de senha (seguro, 32 bytes)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 3. Token expira em 1 hora
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 4. ENVIAR EMAIL DIRETAMENTE (sem depender do workflow/subscriber)
    try {
      // Formatar dados do email
      const firstName = customer.first_name || customer.email.split('@')[0] || 'Cliente';
      const storeUrl = process.env.STORE_URL || 'http://localhost:8000';
      const actionUrl = `${storeUrl}/account?token=${resetToken}&email=${encodeURIComponent(customer.email)}`;

      // Enviar email via SendGrid
      const emailData = {
        firstName,
        actionUrl,
      };

      await sendgridClient.send({
        to: customer.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        templateId: SENDGRID_TEMPLATES.RESET_PASSWORD,
        dynamicTemplateData: emailData,
        subject: 'Restablecer contraseña',
      });
    } catch (emailError) {
      console.error('[Password Reset] Erro ao enviar e-mail:', emailError);
      // Continua mesmo se o email falhar (não bloqueia a resposta)
    }

    // 5. Retornar sucesso
    return res.status(200).json({
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir sua senha',
    });
  } catch {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar solicitação',
    });
  }
}
