import { model } from '@medusajs/framework/utils';

const Contact = model.define('contact', {
  id: model.id().primaryKey(),
  first_name: model.text(),
  last_name: model.text(),
  email: model.text().unique().searchable(),
  phone: model.text(),
  subject: model.text(),
  message: model.text(),
  metadata: model.json().nullable(),
});

export default Contact;
