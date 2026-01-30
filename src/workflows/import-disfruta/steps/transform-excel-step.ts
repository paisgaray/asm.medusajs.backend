import { ContainerRegistrationKeys, ProductStatus } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import * as fs from 'fs';
import XLSX from 'xlsx';

/**
 * Funções auxiliares de sanitização (mantidas ipsis litteris do etl-sanitize.ts)
 */
function generateHandle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (['true', 'verdadeiro', 'sim', 'yes', '1'].includes(lower)) return true;
    if (['false', 'falso', 'não', 'no', '0'].includes(lower)) return false;
  }
  if (typeof value === 'number') return value === 1;
  return false;
}

function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.round(value * 100); // Converte para centavos
  if (typeof value === 'string') {
    let cleaned = value.trim().replace(/[^\d.,-]/g, '');
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return Math.round(num * 100); // Converte para centavos
  }
  return null;
}

function normalizeWeight(value: unknown): number | null {
  if (!value) return null;
  const weightStr = String(value).trim();
  // Remove "kg", "g", espaços e caracteres não numéricos exceto ponto e vírgula
  let cleaned = weightStr.replace(/kg|g|KG|G/gi, '').replace(/\s+/g, '');
  // Se tem vírgula, converte para ponto
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Remove tudo que não é número ou ponto
  cleaned = cleaned.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractCategoryHandle(categoryPath: string): string {
  if (!categoryPath || typeof categoryPath !== 'string') {
    return '';
  }
  
  // Primeiro, remove partes após pipe (|) se houver
  let cleanPath = categoryPath;
  if (categoryPath.includes('|')) {
    const partsByPipe = categoryPath.split('|');
    cleanPath = partsByPipe[0].trim(); // Pega apenas a primeira parte antes do pipe
  }
  
  // Depois, separa por » e pega o último elemento (categoria filho)
  const parts = cleanPath.split('»').map(p => p.trim());
  const lastCategory = parts[parts.length - 1];
  
  return generateHandle(lastCategory);
}

type TransformExcelStepInput = {
  filePath: string;
  salesChannelId?: string;
  shippingProfileId?: string;
};

type TransformedProduct = {
  title: string;
  handle: string;
  subtitle?: string;
  description?: string;
  status: string;
  thumbnail?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  hs_code?: string;
  origin_country?: string;
  mid_code?: string;
  material?: string;
  collection_id?: string;
  type_id?: string;
  tags?: string[];
  discountable?: boolean;
  external_id?: string;
  category_handle?: string;
  shipping_profile_id?: string;
  sales_channel_ids?: string[];
  images?: Array<{ url: string }>;
  options?: Array<{ title: string; values: string[] }>;
  variants?: Array<{
    title: string;
    sku?: string;
    barcode?: string;
    allow_backorder?: boolean;
    manage_inventory?: boolean;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    hs_code?: string;
    origin_country?: string;
    mid_code?: string;
    material?: string;
    prices?: Array<{ amount: number; currency_code: string }>;
    options?: Record<string, string>;
  }>;
};

type TransformExcelStepOutput = {
  products: TransformedProduct[];
  categoryMap: Map<string, { parent: string; child: string }>;
};

export const transformDisfrutaExcelStep = createStep(
  'transform-disfruta-excel-step',
  async (input: TransformExcelStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    
    if (!fs.existsSync(input.filePath)) {
      throw new Error(`Arquivo não encontrado: ${input.filePath}`);
    }

    logger.info(`Lendo arquivo Excel: ${input.filePath}`);

    // Lê Excel
    const workbook = XLSX.readFile(input.filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false
    });

    if (rawData.length === 0) {
      throw new Error('Arquivo Excel está vazio');
    }

    logger.info(`Processando ${rawData.length} linhas`);

    // Busca IDs do banco se não fornecidos
    let salesChannelId = input.salesChannelId;
    let shippingProfileId = input.shippingProfileId;

    if (!salesChannelId || !shippingProfileId) {
      try {
        if (!salesChannelId) {
          const salesChannelModule = container.resolve('salesChannel') as any;
          const salesChannels = await salesChannelModule.listSalesChannels({});
          if (salesChannels && salesChannels.length > 0) {
            const defaultChannel = salesChannels.find((sc: any) => 
              sc.name?.toLowerCase().includes('default') || sc.is_default === true
            ) || salesChannels[0];
            salesChannelId = defaultChannel.id;
            logger.info(`Sales Channel encontrado: ${defaultChannel.name} (${salesChannelId})`);
          }
        }

        if (!shippingProfileId) {
          const shippingProfileModule = container.resolve('shippingProfile') as any;
          const shippingProfiles = await shippingProfileModule.listShippingProfiles({});
          if (shippingProfiles && shippingProfiles.length > 0) {
            const defaultProfile = shippingProfiles.find((sp: any) => 
              sp.name?.toLowerCase().includes('default')
            ) || shippingProfiles[0];
            shippingProfileId = defaultProfile.id;
            logger.info(`Shipping Profile encontrado: ${defaultProfile.name} (${shippingProfileId})`);
          }
        }
      } catch (error: any) {
        logger.warn(`Erro ao buscar IDs do banco: ${error.message}`);
      }
    }

    // Agrupa linhas por produto (mesmo título)
    const productsMap = new Map<string, Record<string, unknown>[]>();
    const categoryMap = new Map<string, { parent: string; child: string }>();

    for (const row of rawData) {
      const title = String(row['Product Title'] || '').trim();
      if (!title) continue;

      if (!productsMap.has(title)) {
        productsMap.set(title, []);
      }
      productsMap.get(title)!.push(row);

      // Extrai hierarquia de categorias
      const categoryPath = String(row['Product Category'] || '').trim();
      if (categoryPath && categoryPath.includes('»')) {
        let cleanPath = categoryPath;
        if (categoryPath.includes('|')) {
          const partsByPipe = categoryPath.split('|');
          cleanPath = partsByPipe[0].trim();
        }
        const parts = cleanPath.split('»').map((p) => p.trim());
        if (parts.length >= 2) {
          const parentName = parts[0];
          const childName = parts[parts.length - 1];
          const parentHandle = generateHandle(parentName);
          const childHandle = generateHandle(childName);
          
          if (!categoryMap.has(childHandle)) {
            categoryMap.set(childHandle, { parent: parentHandle, child: childHandle });
          }
        }
      }
    }

    // Transforma para formato do Medusa
    const transformedProducts: TransformedProduct[] = [];

    for (const [title, rows] of productsMap.entries()) {
      const firstRow = rows[0] as Record<string, unknown>;
      const handle = generateHandle(title);
      
      // Coleta imagens
      const images: Array<{ url: string }> = [];
      if (firstRow['Product Thumbnail']) {
        images.push({ url: String(firstRow['Product Thumbnail']) });
      }
      if (firstRow['Product Image 1 Url']) {
        images.push({ url: String(firstRow['Product Image 1 Url']) });
      }
      if (firstRow['Product Image 2 Url']) {
        images.push({ url: String(firstRow['Product Image 2 Url']) });
      }

      // Coleta opções e variantes
      const variants: TransformedProduct['variants'] = [];
      const optionsMap = new Map<string, Set<string>>();

      for (const row of rows) {
        const rowData = row as Record<string, unknown>;
        const optionName = String(rowData['Variant Option 1 Name'] || '').trim();
        const optionValue = String(rowData['Variant Option 1 Value'] || '').trim();

        if (optionName && optionValue) {
          if (!optionsMap.has(optionName)) {
            optionsMap.set(optionName, new Set());
          }
          optionsMap.get(optionName)!.add(optionValue);
        }

        const variantTitle = String(rowData['Variant Title'] || rowData['Variant Option 1 Value'] || '').trim();
        const sku = String(rowData['Variant SKU'] || '').trim();
        const priceEUR = normalizePrice(rowData['Variant Price EUR']);
        const priceUSD = normalizePrice(rowData['Variant Price USD']);

        const prices: Array<{ amount: number; currency_code: string }> = [];
        if (priceEUR !== null) {
          prices.push({ amount: priceEUR, currency_code: 'eur' });
        }
        if (priceUSD !== null) {
          prices.push({ amount: priceUSD, currency_code: 'usd' });
        }

        const variant: TransformedProduct['variants'][0] = {
          title: variantTitle || title,
          sku: sku || undefined,
          barcode: rowData['Variant Barcode'] ? String(rowData['Variant Barcode']) : undefined,
          allow_backorder: normalizeBoolean(rowData['Variant Allow Backorder']),
          manage_inventory: normalizeBoolean(rowData['Variant Manage Inventory']),
          weight: normalizeWeight(rowData['Variant Weight'] || firstRow['Product Weight']),
          prices: prices.length > 0 ? prices : undefined,
        };

        if (optionName && optionValue) {
          variant.options = { [optionName]: optionValue };
        }

        variants.push(variant);
      }

      // Constrói opções
      const options: Array<{ title: string; values: string[] }> = [];
      for (const [optionTitle, valuesSet] of optionsMap.entries()) {
        options.push({
          title: optionTitle,
          values: Array.from(valuesSet),
        });
      }

      // Extrai categoria
      const categoryPath = String(firstRow['Product Category'] || '').trim();
      const categoryHandle = extractCategoryHandle(categoryPath);

      const product: TransformedProduct = {
        title,
        handle,
        subtitle: firstRow['Product Subtitle'] ? String(firstRow['Product Subtitle']) : undefined,
        description: firstRow['Product Description'] ? String(firstRow['Product Description']) : undefined,
        status: firstRow['Product Status'] === 'published' ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
        thumbnail: firstRow['Product Thumbnail'] ? String(firstRow['Product Thumbnail']) : undefined,
        weight: normalizeWeight(firstRow['Product Weight']),
        discountable: normalizeBoolean(firstRow['Product Discountable']),
        category_handle: categoryHandle || undefined,
        shipping_profile_id: shippingProfileId || undefined,
        sales_channel_ids: salesChannelId ? [salesChannelId] : undefined,
        images: images.length > 0 ? images : undefined,
        options: options.length > 0 ? options : undefined,
        variants: variants.length > 0 ? variants : undefined,
      };

      transformedProducts.push(product);
    }

    logger.info(`Transformados ${transformedProducts.length} produtos únicos`);

    return new StepResponse<TransformExcelStepOutput>({
      products: transformedProducts,
      categoryMap,
    });
  },
);
