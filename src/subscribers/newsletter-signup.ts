import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

type NewsletterSignupData = {
  email: string;
};

export default async function newsletterSignupHandler({
  event: { data },
  container,
}: SubscriberArgs<NewsletterSignupData>): Promise<void> {
  const { email } = data;

  try {
    // Resolver o módulo de newsletter
    const newsletterService: any = container.resolve('newsletter');

    // Verificar se o email já existe
    const existingSubscribers = await newsletterService.listNewsletterSubscribers({
      email,
    });

    if (existingSubscribers.length > 0) {
      console.log(`[Newsletter] Email ${email} já está cadastrado`);
      return;
    }

    // Criar novo subscriber no banco
    await newsletterService.createNewsletterSubscribers({
      email,
      source: 'store',
      subscribed_at: new Date(),
    });

    console.log(`[Newsletter] Email ${email} cadastrado com sucesso no banco de dados`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[Newsletter] Erro ao processar inscrição de ${email}:`, errorMessage);
  }
}

export const config: SubscriberConfig = {
  event: 'newsletter.signup',
};
