import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { subscribeNewsletterWorkflow } from '../../../../workflows/newsletter/subscribe-newsletter-workflow';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, first_name, last_name } = req.body as {
      email: string;
      first_name?: string;
      last_name?: string;
    };

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório',
      });
    }

    const { result } = await subscribeNewsletterWorkflow(req.scope).run({
      input: {
        email,
        first_name,
        last_name,
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Newsletter API] Erro:', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao processar inscrição',
    });
  }
}
