# Newsletter SendGrid Integration

## Descrição

Módulo de integração com SendGrid para capturar e-mails de usuários que se inscrevem na newsletter e salvá-los no CRM do SendGrid (Marketing Contacts).

## Endpoint

### POST `/store/newsletter`

Endpoint para inscrição de usuários na newsletter.

#### Request Body

```json
{
  "email": "usuario@exemplo.com"
}
```

#### Response Success (200)

```json
{
  "success": true,
  "message": "Inscrição realizada com sucesso",
  "email": "usuario@exemplo.com"
}
```

**Nota**: A resposta 200 indica que o evento foi emitido com sucesso. O processamento real (adição ao CRM do SendGrid) acontece de forma assíncrona no subscriber. Verifique os logs do servidor ou o painel do SendGrid para confirmar se o contato foi adicionado.

#### Response Error (400)

Validação de e-mail inválido:

```json
{
  "type": "invalid_data",
  "message": "Email inválido"
}
```

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis de ambiente no arquivo `.env`:

```env
# SendGrid API Key (obrigatória para salvar contatos no CRM)
SENDGRID_API_KEY=your-sendgrid-api-key

# Email remetente verificado no SendGrid (opcional, apenas se quiser enviar emails via Notification Module)
# SENDGRID_FROM=seu-email@dominio.com
```

## Como obter as credenciais do SendGrid

### 1. API Key

1. Acesse o painel do SendGrid: https://app.sendgrid.com
2. Vá em **Settings** > **API Keys**
3. Clique em **Create API Key**
4. Dê um nome à chave (ex: "Medusa Newsletter CRM")
5. **IMPORTANTE - Selecionar Permissões:**
   
   **Opção A - Full Access (Recomendado para testes):**
   - Selecione **Full Access**
   
   **Opção B - Restricted Access (Produção):**
   - Selecione **Restricted Access**
   - Em **Permissions**, procure e ative:
     - ✅ **Marketing Contacts** (obrigatório para salvar contatos no CRM)
     - ✅ **Mail Send** (opcional, apenas se quiser enviar emails)
   
6. Clique em **Create & View**
7. **IMPORTANTE**: Copie a chave imediatamente - você só poderá vê-la uma vez!
8. Adicione ao `.env` como `SENDGRID_API_KEY`

**⚠️ Se você já criou a API Key sem as permissões corretas:**
1. Você precisa criar uma NOVA API Key com as permissões corretas
2. A API Key antiga não pode ser editada - apenas excluída e recriada
3. Após criar a nova chave, atualize o `.env` e reinicie o servidor

### 2. Email Remetente (SENDGRID_FROM) - Opcional

1. No painel do SendGrid, vá em **Settings** > **Sender Authentication**
2. Siga as instruções para verificar um remetente único (Single Sender Verification)
3. Após verificação, use esse e-mail no `.env` como `SENDGRID_FROM`
4. **Nota**: Esta variável só é necessária se você quiser usar o módulo de notificação do Medusa para enviar emails. Para apenas salvar contatos no CRM, não é necessária.

## Arquitetura

Seguindo o padrão oficial do Medusa (baseado no guia Mailchimp):

1. **Rota Store API** (`POST /store/newsletter`): 
   - Valida o email
   - Emite evento `newsletter.signup` via Event Bus

2. **Subscriber** (`src/subscribers/newsletter-signup.ts`):
   - Escuta o evento `newsletter.signup`
   - Adiciona o contato ao CRM do SendGrid via Marketing Contacts API

3. **Service** (`src/services/sendgrid-marketing.service.ts`):
   - Encapsula a integração com a API do SendGrid Marketing Contacts

## Como funciona

1. O usuário envia uma requisição POST para `/store/newsletter` com seu e-mail
2. O endpoint valida o formato do e-mail e emite o evento `newsletter.signup`
3. O subscriber `newsletter-signup` escuta o evento
4. O subscriber utiliza o `SendGridMarketingService` para adicionar o contato ao CRM via API Marketing Contacts
5. O contato é adicionado automaticamente ao "All Contacts" do SendGrid (CRM)

## Dependências

- `@sendgrid/client`: Cliente oficial do SendGrid para integração com a API
- `@medusajs/medusa/notification-sendgrid`: Provider de notificação SendGrid (já incluído no framework Medusa)

## Instalação de Dependências

```bash
yarn add @sendgrid/client
```

ou

```bash
npm install @sendgrid/client
```

## Estrutura de Arquivos

```
src/
├── api/
│   └── store/
│       └── newsletter/
│           ├── route.ts           # Endpoint POST /store/newsletter
│           ├── validators.ts      # Validação do schema (Zod)
│           ├── middleware.ts      # Middleware de validação
│           └── README.md          # Esta documentação
└── services/
    └── sendgrid-marketing.service.ts  # Serviço de integração com SendGrid Marketing API
```

## Testando a Integração

### Usando cURL

**Importante**: No Medusa v2, rotas da store exigem o header `x-publishable-api-key`. Use sua publishable API key:

```bash
# Substitua pela sua publishable API key
curl -X POST http://localhost:9000/store/newsletter \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pk_40f54fdf1f8aee2fcda9a9bcbcc8dcfa617771186e2f3dfbc019731fa1c6f1a5" \
  -d '{"email": "usuario@exemplo.com"}'
```

**Exemplo com variável de ambiente** (mais seguro):

```bash
export PUBLISHABLE_KEY="pk_40f54fdf1f8aee2fcda9a9bcbcc8dcfa617771186e2f3dfbc019731fa1c6f1a5"

curl -X POST http://localhost:9000/store/newsletter \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: $PUBLISHABLE_KEY" \
  -d '{"email": "teste@exemplo.com"}'
```

### Usando Postman

1. Método: `POST`
2. URL: `http://localhost:9000/store/newsletter`
3. Headers:
   - `Content-Type: application/json`
   - `x-publishable-api-key: pk_40f54fdf1f8aee2fcda9a9bcbcc8dcfa617771186e2f3dfbc019731fa1c6f1a5`
4. Body (raw JSON):
   ```json
   {
     "email": "usuario@exemplo.com"
   }
   ```

### Obtendo sua Publishable API Key

1. Acesse o painel admin do Medusa (geralmente `http://localhost:9000/app`)
2. Vá em **Settings** > **API Keys**
3. Copie a chave **Publishable** (começa com `pk_`)

## Verificação no SendGrid

### Opção 1: Via API (Recomendado se o painel não estiver acessível)

Como a conta trial do SendGrid pode ter restrições no acesso ao painel de Marketing, você pode verificar se o contato foi adicionado usando a API:

```bash
# Buscar um contato específico
curl -X POST "https://api.sendgrid.com/v3/marketing/contacts/search" \
  -H "Authorization: Bearer SEU_SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "email LIKE '\''usuario@exemplo.com'\''"
  }'
```

### Opção 2: Via Painel (se disponível)

1. Acesse o painel do SendGrid: https://app.sendgrid.com
2. Vá em **Marketing** > **Contacts**
3. Verifique se o e-mail foi adicionado ao "All Contacts" (CRM)

**Nota**: Se você não conseguir acessar a seção de Marketing no painel, isso pode ser devido a:
- Limitações da conta trial
- Conta criada via parceiros (ex: Azure) que pode não ter acesso completo
- Nesse caso, use a Opção 1 (API) para verificar os contatos

## Troubleshooting

### Erro: "Publishable API key required in the request header"

**Causa**: O Medusa v2 exige publishable API key para rotas da store.

**Solução**: Adicione o header `x-publishable-api-key` na requisição:

```bash
-H "x-publishable-api-key: pk_sua_chave_aqui"
```

### Erro: "Configuração do SendGrid não encontrada"

- Verifique se `SENDGRID_API_KEY` está configurada no arquivo `.env`
- Reinicie o servidor após adicionar as variáveis de ambiente
- Verifique os logs do servidor para mensagens de erro específicas

### Erro: "Email inválido"

- Verifique se o e-mail está em formato válido (exemplo@dominio.com)

### Erro: "access forbidden. please ensure you have the correct scopes defined"

**Causa**: A API Key do SendGrid não tem as permissões necessárias para acessar a API de Marketing Contacts.

**Solução**:
1. Acesse o painel do SendGrid: https://app.sendgrid.com
2. Vá em **Settings** > **API Keys**
3. **Crie uma NOVA API Key** com:
   - **Full Access** (recomendado para testes), OU
   - **Restricted Access** com a permissão **"Marketing Contacts"** habilitada
4. **IMPORTANTE**: API Keys não podem ser editadas. Você precisa criar uma nova.
5. Copie a nova chave e atualize o `.env`:
   ```env
   SENDGRID_API_KEY=nova_chave_aqui
   ```
6. Reinicie o servidor Medusa
7. Teste novamente o endpoint

**Verificar se a API Key funciona** (teste direto na API):

```bash
curl -X PUT "https://api.sendgrid.com/v3/marketing/contacts" \
  -H "Authorization: Bearer SEU_SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"email": "teste@exemplo.com"}
    ]
  }'
```

Se funcionar, você receberá status `202 Accepted`. Se não funcionar, verifique as permissões da chave.

### Erro ao adicionar contato ao SendGrid (outros erros)

- Verifique se a API Key está correta e ativa
- Verifique os logs do servidor para mais detalhes
- Verifique se o SendGrid está funcionando: https://status.sendgrid.com/

### Não consigo acessar o painel de Marketing do SendGrid

Isso é comum em contas trial ou contas criadas via parceiros. Use a API para verificar se os contatos foram adicionados (veja seção "Verificação no SendGrid - Opção 1" acima).

## Referências

- [SendGrid Marketing Contacts API](https://docs.sendgrid.com/api-reference/contacts/add-or-update-a-contact)
- [Medusa Notification Module](https://docs.medusajs.com/resources/infrastructure-modules/notification)
- [SendGrid Provider Documentation](https://docs.medusajs.com/resources/infrastructure-modules/notification/sendgrid)
