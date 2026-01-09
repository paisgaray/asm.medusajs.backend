import { z } from 'zod';

export const NewsletterSubscribeSchema = z.object({
  email: z.string().email('Email inválido'),
});

export type NewsletterSubscribeBody = z.infer<typeof NewsletterSubscribeSchema>;
