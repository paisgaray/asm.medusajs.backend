import sgClient from '@sendgrid/client';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not defined in environment variables.');
}

sgClient.setApiKey(process.env.SENDGRID_API_KEY);

export const sendgridMarketingClient = sgClient;
