#!/bin/bash

# Script para verificar contatos adicionados ao SendGrid via API
# Uso: ./scripts/check-sendgrid-contacts.sh [email]

SENDGRID_API_KEY="${SENDGRID_API_KEY:-}"

if [ -z "$SENDGRID_API_KEY" ]; then
  echo "Erro: SENDGRID_API_KEY não configurada"
  echo "Exporte a variável: export SENDGRID_API_KEY=sua_chave_aqui"
  exit 1
fi

EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
  echo "Buscando todos os contatos (primeiros 10)..."
  curl -X GET "https://api.sendgrid.com/v3/marketing/contacts?page_size=10" \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" | jq '.'
else
  echo "Buscando contato: $EMAIL"
  curl -X POST "https://api.sendgrid.com/v3/marketing/contacts/search" \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"email LIKE '$EMAIL'\"
    }" | jq '.'
fi
