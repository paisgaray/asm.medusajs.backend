import client from '@sendgrid/client';

export interface AddContactToMarketingListOptions {
  email: string;
  customFields?: Record<string, unknown>;
}

export class SendGridMarketingService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    client.setApiKey(this.apiKey);
  }

  /**
   * Adiciona um contato à lista de marketing do SendGrid (CRM)
   * Usa PUT para adicionar ou atualizar o contato
   * @param options - Opções para adicionar o contato
   * @returns Promise com o resultado da operação
   */
  async addContactToList(options: AddContactToMarketingListOptions): Promise<{ success: boolean; message?: string }> {
    try {
      const { email, customFields } = options;

      // Estrutura do body conforme documentação SendGrid v3 Marketing Contacts API
      // O contato será adicionado automaticamente ao "All Contacts" do SendGrid
      const requestBody: {
        contacts: Array<{
          email: string;
          custom_fields?: Record<string, unknown>;
        }>;
      } = {
        contacts: [
          {
            email,
            ...(customFields && { custom_fields: customFields }),
          },
        ],
      };

      const [response] = await client.request({
        url: '/v3/marketing/contacts',
        method: 'PUT',
        body: requestBody,
      });

      // SendGrid retorna 202 para PUT requests bem-sucedidas
      if (response.statusCode === 202) {
        return {
          success: true,
          message: 'Contato adicionado com sucesso ao CRM do SendGrid',
        };
      }

      return {
        success: false,
        message: `Erro ao adicionar contato: Status ${response.statusCode}`,
      };
    } catch (error: unknown) {
      // Tratamento de erros do SendGrid
      if (error && typeof error === 'object' && 'response' in error) {
        const sendGridError = error as {
          response?: {
            statusCode?: number;
            body?: {
              errors?: Array<{ message?: string; field?: string; help?: string }>;
            };
          };
        };

        const statusCode = sendGridError.response?.statusCode;
        const errors = sendGridError.response?.body?.errors || [];
        const errorMessages = errors.map((e) => e.message || 'Erro desconhecido').join(', ');
        const helpMessages = errors.map((e) => e.help || '').filter(Boolean).join(' ');

        // Erro específico de permissões (403)
        if (statusCode === 403) {
          return {
            success: false,
            message: `${errorMessages}${helpMessages ? ` - ${helpMessages}` : ''}. Por favor, verifique se sua API Key tem permissões de "Marketing Contacts" ou "Full Access".`,
          };
        }

        return {
          success: false,
          message: errorMessages || `Erro ao adicionar contato ao SendGrid (Status: ${statusCode})`,
        };
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao adicionar contato ao SendGrid';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Verifica se um e-mail já existe na base de contatos do SendGrid
   * @param email - Email a ser verificado
   * @returns Promise com informação se o contato existe
   */
  async contactExists(email: string): Promise<boolean> {
    try {
      const [response] = await client.request({
        url: `/v3/marketing/contacts/search`,
        method: 'POST',
        body: {
          query: `email LIKE '${email}'`,
        },
      });

      return (response.body as any).result_count > 0;
    } catch {
      return false;
    }
  }
}
