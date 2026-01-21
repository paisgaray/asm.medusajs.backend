import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not defined in environment variables.');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendgridClient = sgMail;
