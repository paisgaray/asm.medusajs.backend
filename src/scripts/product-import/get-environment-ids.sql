-- Script SQL para extrair IDs necessários para hidratação do CSV
-- Execute estas queries em cada ambiente (Local, Dev, Prod) antes do import

-- 1. Sales Channels
-- Copie o ID do canal padrão ou do canal específico que você quer usar
SELECT 
    id,
    name,
    is_default,
    created_at
FROM sales_channel
ORDER BY is_default DESC, created_at ASC;

-- 2. Shipping Profiles
-- Copie o ID do perfil padrão
SELECT 
    id,
    name,
    type,
    created_at
FROM shipping_profile
ORDER BY created_at ASC;

-- 3. Regions (para validar moeda EUR)
-- Garanta que existe uma região com currency_code = 'eur'
SELECT 
    id,
    name,
    currency_code,
    created_at
FROM region
WHERE currency_code = 'eur'
ORDER BY created_at ASC;

-- 4. Product Categories (para validar antes do import)
-- Verifique se todas as categorias do CSV existem
SELECT 
    id,
    name,
    handle,
    parent_category_id,
    created_at
FROM product_category
ORDER BY handle ASC;

-- 5. Collections (opcional, se usar Product Collection Id)
SELECT 
    id,
    title,
    handle,
    created_at
FROM product_collection
ORDER BY handle ASC;
