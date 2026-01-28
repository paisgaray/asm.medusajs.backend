/**
 * SendGrid Template IDs
 * IDs criados pelo front-end para cada tipo de e-mail
 */

export const SENDGRID_TEMPLATES = {
  RESET_PASSWORD: 'd-97f70554211843c08e630e384ae6951f',
  ORDER_DELIVERED: 'd-c0157e4c7a4a4ebe839fae834b9d6168',
  ORDER_SHIPPED: 'd-4901f2e3d61c47c2b5f9569065c08616',
  ORDER_PREPARING: 'd-e0153efc5c184f878e833c2d42ca3247',
  ORDER_INVOICED: 'd-c3c0dd4a6d0a46d6ab25da1ce99f6f89',
  ORDER_CONFIRMATION: 'd-51287e3277764d86aea821a1ea60c022',
  PAYMENT_NOT_APPROVED: 'd-b23249abe881427f8badc774880eba76',
  PAYMENT_APPROVED: 'd-dadda7e1dafb4d52b9cd80fc5e546590',
} as const;

export type SendGridTemplateId = (typeof SENDGRID_TEMPLATES)[keyof typeof SENDGRID_TEMPLATES];
