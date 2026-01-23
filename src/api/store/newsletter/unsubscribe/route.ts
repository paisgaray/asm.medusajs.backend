import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { sendgridClient } from '../../../../utils/sendgrid-client';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const searchResponse = await sendgridClient.request({
      url: '/v3/marketing/contacts/search',
      method: 'POST',
      body: {
        query: `email LIKE '${normalizedEmail}'`,
      },
    });

    const contacts = (searchResponse[1]?.body as { result?: { id: string }[] })?.result || [];

    if (contacts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email não encontrado na newsletter',
      });
    }

    const contactId = contacts[0].id;

    await sendgridClient.request({
      url: '/v3/marketing/contacts',
      method: 'DELETE',
      qs: {
        ids: contactId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Email removido da newsletter com sucesso',
    });
  } catch (error) {
    console.error('[Newsletter Unsubscribe] Erro:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro ao remover email da newsletter',
    });
  }
}
