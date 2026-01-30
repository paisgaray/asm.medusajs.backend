/**
 * DRY RUN do script de sanitização
 * Mostra preview das primeiras linhas sem salvar arquivo
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ExecArgs } from '@medusajs/framework/types';

interface ProductRow {
  [key: string]: string | number | boolean | undefined;
}

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

function normalizeBoolean(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === 'verdadeiro' || lower === 'sim' || lower === 'yes' || lower === '1') {
      return 'true';
    }
    if (lower === 'false' || lower === 'falso' || lower === 'não' || lower === 'no' || lower === '0') {
      return 'false';
    }
  }
  if (typeof value === 'number') {
    return value === 1 ? 'true' : 'false';
  }
  return 'false';
}

function normalizePrice(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  if (typeof value === 'string') {
    let cleaned = value.trim().replace(/[^\d.,-]/g, '');
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      return num.toFixed(2);
    }
  }
  return '';
}

function extractCategoryHandle(categoryPath: string): string {
  if (!categoryPath || typeof categoryPath !== 'string') {
    return '';
  }
  const parts = categoryPath.split('»').map(p => p.trim());
  const lastCategory = parts[parts.length - 1];
  return generateHandle(lastCategory);
}

const OFFICIAL_HEADERS = [
  'Product Id',
  'Product Handle',
  'Product Title',
  'Product Subtitle',
  'Product Description',
  'Product Status',
  'Product Thumbnail',
  'Product Weight',
  'Product Length',
  'Product Width',
  'Product Height',
  'Product HS Code',
  'Product Origin Country',
  'Product MID Code',
  'Product Material',
  'Product Collection Id',
  'Product Type Id',
  'Product Tag 1',
  'Product Discountable',
  'Product External Id',
  'Variant Id',
  'Variant Title',
  'Variant SKU',
  'Variant Barcode',
  'Variant Allow Backorder',
  'Variant Manage Inventory',
  'Variant Weight',
  'Variant Length',
  'Variant Width',
  'Variant Height',
  'Variant HS Code',
  'Variant Origin Country',
  'Variant MID Code',
  'Variant Material',
  'Variant Price EUR',
  'Variant Price USD',
  'Variant Option 1 Name',
  'Variant Option 1 Value',
  'Product Image 1 Url',
  'Product Image 2 Url',
  'Product Category 1',
];

const COLUMN_MAPPING: Record<string, string> = {
  'Product Category': 'Product Category 1',
};

export default async function dryRunSanitize({
  args,
}: ExecArgs) {
  const [inputPath] = args;

  if (!inputPath) {
    console.error('❌ Erro: Caminho do arquivo Excel não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/etl-sanitize-dry-run.ts <input-excel>');
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo Excel: ${inputFile}`);
  console.log(`🔍 DRY RUN - Nenhum arquivo será salvo\n`);

  try {
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData: ProductRow[] = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false
    });

    if (rawData.length === 0) {
      console.error('❌ Erro: Arquivo Excel está vazio');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${rawData.length} linhas de dados\n`);

    const rawHeaders = Object.keys(rawData[0]);
    const normalizedHeaders = rawHeaders.map(h => h.trim());

    // Processa apenas as primeiras 3 linhas
    const previewRows = rawData.slice(0, 3);
    const sanitizedRows: any[] = [];

    for (let i = 0; i < previewRows.length; i++) {
      const row = previewRows[i];
      const sanitizedRow: any = {};

      for (const header of OFFICIAL_HEADERS) {
        let value: any = '';

        const originalHeaderIndex = normalizedHeaders.findIndex(h => 
          h === header || COLUMN_MAPPING[h] === header
        );

        if (originalHeaderIndex !== -1) {
          const originalHeader = rawHeaders[originalHeaderIndex];
          value = row[originalHeader];
        }

        if (header === 'Product Handle') {
          const title = row['Product Title'] || '';
          value = value || generateHandle(String(title));
        } else if (header === 'Product Category 1') {
          const categoryPath = row['Product Category'] || value || '';
          value = extractCategoryHandle(String(categoryPath));
        } else if (header === 'Product Discountable' || 
                   header === 'Variant Allow Backorder' || 
                   header === 'Variant Manage Inventory') {
          value = normalizeBoolean(value);
        } else if (header === 'Variant Price EUR' || header === 'Variant Price USD') {
          value = normalizePrice(value);
        } else if (header === 'Variant Barcode') {
          value = value ? String(value) : '';
        }

        sanitizedRow[header] = value || '';
      }

      sanitizedRows.push(sanitizedRow);
    }

    // Mostra preview
    console.log('📊 PREVIEW DAS PRIMEIRAS 3 LINHAS SANITIZADAS:\n');
    console.log('='.repeat(80));
    
    sanitizedRows.forEach((row, index) => {
      console.log(`\n🔹 LINHA ${index + 1}:`);
      console.log(JSON.stringify(row, null, 2));
      console.log('-'.repeat(80));
    });

    console.log(`\n✅ Campos críticos verificados:`);
    console.log(`   - Product Handle: ${sanitizedRows[0]['Product Handle'] ? '✅ Gerado' : '❌ Vazio'}`);
    console.log(`   - Product Category 1: ${sanitizedRows[0]['Product Category 1'] ? `✅ ${sanitizedRows[0]['Product Category 1']}` : '❌ Vazio'}`);
    console.log(`   - Variant Price EUR: ${sanitizedRows[0]['Variant Price EUR'] ? `✅ ${sanitizedRows[0]['Variant Price EUR']}` : '⚠️  Vazio'}`);
    console.log(`   - Variant Manage Inventory: ${sanitizedRows[0]['Variant Manage Inventory'] ? `✅ ${sanitizedRows[0]['Variant Manage Inventory']}` : '⚠️  Vazio'}`);
    
    console.log(`\n💡 Para salvar o arquivo completo, execute:`);
    console.log(`   npx medusa exec ./src/scripts/product-import/etl-sanitize.ts ${inputPath} <output-csv>`);

  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    process.exit(1);
  }
}
