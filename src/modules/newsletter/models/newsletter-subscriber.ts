import { model } from '@medusajs/framework/utils';

const NewsletterSubscriber = model.define('newsletter_subscriber', {
  id: model.id().primaryKey(),
  email: model.text().unique().searchable(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  status: model.enum(['subscribed', 'unsubscribed']).default('subscribed'),
  subscribed_at: model.dateTime(),
  unsubscribed_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
});

export default NewsletterSubscriber;
