import { z } from 'zod';

export const CreateContactSchema = z.object({
  first_name: z.string().nonempty(),
  last_name: z.string().nonempty(),
  email: z.string().nonempty(),
  phone: z.string().nonempty(),
  subject: z.string().nonempty(),
  message: z.string().nonempty(),
});

export type CreateContactSchema = z.infer<typeof CreateContactSchema>;
