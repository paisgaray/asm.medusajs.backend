import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import type { NewsletterSubscribeBody } from './validators';

export async function POST(req: MedusaRequest<NewsletterSubscribeBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as NewsletterSubscribeBody;
  const { email } = body;

  // Resolver o event bus service
  const eventModuleService = req.scope.resolve(Modules.EVENT_BUS);

  // Emitir evento newsletter.signup seguindo padrão da documentação
  await eventModuleService.emit({
    name: 'newsletter.signup',
    data: {
      email,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Inscrição realizada com sucesso',
    email,
  });
}
