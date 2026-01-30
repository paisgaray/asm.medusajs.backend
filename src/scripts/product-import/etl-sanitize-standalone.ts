/**
 * Script de ETL Standalone - Não requer conexão com banco
 * Gera CSV sanitizado a partir do Excel do cliente
 * 
 * Uso: npx medusa exec ./src/scripts/product-import/etl-sanitize-standalone.ts <input-excel> <output-csv>
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

export default async function sanitizeExcel({
  args,
}: ExecArgs) {
  const [inputPath, outputPath] = args;

  if (!inputPath) {
    console.error('❌ Erro: Caminho do arquivo Excel não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/etl-sanitize-standalone.ts <input-excel> <output-csv>');
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputPath);
  const outputFile = outputPath 
    ? path.resolve(process.cwd(), outputPath)
    : path.resolve(process.cwd(), 'src/utils/product-import-CHECK-FINAL.csv');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo Excel: ${inputFile}`);

  try {
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData: ProductRow[] = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false
    });

    if (rawData.length === 0) {
      console.error('❌ Erro: Arquivo Excel está vazio ou não contém dados');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${rawData.length} linhas de dados`);

    const rawHeaders = Object.keys(rawData[0]);
    const normalizedHeaders = rawHeaders.map(h => h.trim());

    const sanitizedRows: ProductRow[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const sanitizedRow: ProductRow = {};

      for (const header of OFFICIAL_HEADERS) {
        let value: any = '';

        const originalHeaderIndex = normalizedHeaders.findIndex(h => 
          h === header || COLUMN_MAPPING[h] === header
        );

        if (originalHeaderIndex !== -1) {
          const originalHeader = rawHeaders[originalHeaderIndex];
          value = row[originalHeader];
        }

        // Transformações específicas por coluna
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

      // Adiciona colunas de hidratação com placeholder
      sanitizedRow['Shipping Profile Id'] = 'REQ_HIDRATACAO';
      sanitizedRow['Product Sales Channel 1'] = 'REQ_HIDRATACAO';

      sanitizedRows.push(sanitizedRow);
    }

    // Cria CSV
    const csvHeaders = [
      ...OFFICIAL_HEADERS,
      'Shipping Profile Id',
      'Product Sales Channel 1',
    ];

    const csvRows = sanitizedRows.map(row => {
      return csvHeaders.map(header => {
        const value = row[header] || '';
        if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return String(value);
      });
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    fs.writeFileSync(outputFile, csvContent, 'utf-8');

    console.log(`✅ Arquivo sanitizado salvo em: ${outputFile}`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Linhas processadas: ${sanitizedRows.length}`);
    console.log(`   - Handles gerados: ${sanitizedRows.filter(r => r['Product Handle']).length}`);
    console.log(`   - Categorias extraídas: ${sanitizedRows.filter(r => r['Product Category 1']).length}`);
    console.log(`\n⚠️  PRÓXIMOS PASSOS:`);
    console.log(`   1. Hidrate os IDs de Sales Channel e Shipping Profile usando o script de hidratação`);
    console.log(`   2. Crie as categorias no Admin antes do import`);
    console.log(`   3. Valide o CSV manualmente antes de subir para produção`);

  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    process.exit(1);
  }
}
