/**
 * Script de ETL para sanitizar arquivo Excel do cliente para CSV formatado do MedusaJS
 *
 * Transformações aplicadas:
 * - Geração de Handles (kebab-case, sem acentos)
 * - Normalização de moeda (ponto decimal US)
 * - Normalização de booleanos (true/false)
 * - Renomeação de colunas (Product Category -> Product Category 1)
 * - Remoção de colunas não oficiais
 * - Parsing de categorias hierárquicas
 *
 * Uso:
 * npx medusa exec ./src/scripts/product-import/etl-sanitize.ts <input-excel> <output-csv>
 */

import { ExecArgs } from '@medusajs/framework/types';
import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

interface ProductRow {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Gera handle slug a partir do título do produto
 * Remove acentos, converte para lowercase, substitui espaços por hífens
 */
function generateHandle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Espaços para hífens
    .replace(/-+/g, '-') // Múltiplos hífens para um único
    .replace(/^-|-$/g, ''); // Remove hífens no início/fim
}

/**
 * Normaliza valor booleano para string "true" ou "false"
 */
function normalizeBoolean(value: unknown): string {
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

/**
 * Normaliza preço para formato US (ponto decimal)
 */
function normalizePrice(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Se já é número, formata com ponto
  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  // Se é string, tenta converter
  if (typeof value === 'string') {
    // Remove espaços e caracteres não numéricos exceto ponto e vírgula
    let cleaned = value.trim().replace(/[^\d.,-]/g, '');

    // Se tem vírgula, assume formato europeu (12,50)
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

/**
 * Extrai handle da categoria da hierarquia
 * Ex: "Huevos y Lácteos Eco » Kéfirs" -> "kefirs"
 * Ex: "Cestas de Naranjas | Promociones » Ofertas" -> "ofertas" (ignora parte após |)
 */
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
  const parts = cleanPath.split('»').map((p) => p.trim());
  const lastCategory = parts[parts.length - 1];

  return generateHandle(lastCategory);
}

/**
 * Headers oficiais do template MedusaJS
 */
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
  'Product Category 1', // Adicionado após normalização
];

/**
 * Mapeamento de colunas do cliente para colunas oficiais
 */
const COLUMN_MAPPING: Record<string, string> = {
  'Product Category': 'Product Category 1',
  'Shipping Profile Id': 'Shipping Profile Id', // Mantém para hidratação posterior
  'Product Sales Channel 1': 'Product Sales Channel 1', // Mantém para hidratação posterior
};

export default async function sanitizeExcel({ args }: ExecArgs) {
  const [inputPath, outputPath] = args;

  if (!inputPath) {
    console.error('❌ Erro: Caminho do arquivo Excel não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/etl-sanitize.ts <input-excel> <output-csv>');
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputPath);
  const outputFile = outputPath
    ? path.resolve(process.cwd(), outputPath)
    : path.resolve(process.cwd(), 'src/utils/product-import-sanitized.csv');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo Excel: ${inputFile}`);

  try {
    // Lê o arquivo Excel
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Converte para JSON
    const rawData: ProductRow[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false, // Força tudo como string para evitar problemas de tipo
    });

    if (rawData.length === 0) {
      console.error('❌ Erro: Arquivo Excel está vazio ou não contém dados');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${rawData.length} linhas de dados`);

    // Normaliza headers (remove espaços extras)
    const rawHeaders = Object.keys(rawData[0]);
    const normalizedHeaders = rawHeaders.map((h) => h.trim());

    // Processa cada linha
    const sanitizedRows: ProductRow[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const sanitizedRow: ProductRow = {};

      // Processa cada coluna oficial
      for (const header of OFFICIAL_HEADERS) {
        let value: string | number | boolean | undefined = '';

        // Tenta encontrar o valor na coluna original
        const originalHeaderIndex = normalizedHeaders.findIndex((h) => h === header || COLUMN_MAPPING[h] === header);

        if (originalHeaderIndex !== -1) {
          const originalHeader = rawHeaders[originalHeaderIndex];
          value = row[originalHeader];
        }

        // Transformações específicas por coluna
        if (header === 'Product Handle') {
          // Gera handle se estiver vazio
          const title = row['Product Title'] || '';
          value = value || generateHandle(String(title));
        } else if (header === 'Product Category 1') {
          // Extrai handle da categoria hierárquica
          const categoryPath = row['Product Category'] || value || '';
          value = extractCategoryHandle(String(categoryPath));
        } else if (
          header === 'Product Discountable' ||
          header === 'Variant Allow Backorder' ||
          header === 'Variant Manage Inventory'
        ) {
          // Normaliza booleanos
          value = normalizeBoolean(value);
        } else if (header === 'Variant Price EUR' || header === 'Variant Price USD') {
          // Normaliza preços
          value = normalizePrice(value);
        } else if (header === 'Variant Barcode') {
          // Preserva barcode como string para evitar notação científica
          value = value ? String(value) : '';
        } else if (header === 'Product Weight' || header === 'Variant Weight') {
          // Remove unidades (kg, g) e caracteres não numéricos, mantém apenas números e ponto decimal
          if (value) {
            const weightStr = String(value).trim();
            // Remove "kg", "g", espaços e caracteres não numéricos exceto ponto e vírgula
            let cleaned = weightStr.replace(/kg|g|KG|G/gi, '').replace(/\s+/g, '');
            // Se tem vírgula, converte para ponto
            if (cleaned.includes(',')) {
              cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            }
            // Remove tudo que não é número ou ponto
            cleaned = cleaned.replace(/[^\d.]/g, '');
            // Se está vazio ou não é um número válido, retorna vazio
            const num = parseFloat(cleaned);
            value = isNaN(num) ? '' : String(num);
          } else {
            value = '';
          }
        }

        sanitizedRow[header] = value || '';
      }

      // Adiciona colunas de hidratação se existirem no original
      if (row['Shipping Profile Id']) {
        sanitizedRow['Shipping Profile Id'] = row['Shipping Profile Id'];
      }
      if (row['Product Sales Channel 1']) {
        sanitizedRow['Product Sales Channel 1'] = row['Product Sales Channel 1'];
      }

      sanitizedRows.push(sanitizedRow);
    }

    // Cria CSV
    const csvHeaders = [
      ...OFFICIAL_HEADERS,
      'Shipping Profile Id', // Adiciona para hidratação
      'Product Sales Channel 1', // Adiciona para hidratação
    ];

    const csvRows = sanitizedRows.map((row) => {
      return csvHeaders.map((header) => {
        const value = row[header] || '';
        // Escapa valores que contêm vírgulas ou aspas
        if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return String(value);
      });
    });

    const csvContent = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

    // Salva arquivo
    fs.writeFileSync(outputFile, csvContent, 'utf-8');

    console.log(`✅ Arquivo sanitizado salvo em: ${outputFile}`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Linhas processadas: ${sanitizedRows.length}`);
    console.log(`   - Handles gerados: ${sanitizedRows.filter((r) => r['Product Handle']).length}`);
    console.log(`   - Categorias extraídas: ${sanitizedRows.filter((r) => r['Product Category 1']).length}`);

    console.log(`\n⚠️  PRÓXIMOS PASSOS:`);
    console.log(`   1. Hidrate os IDs de Sales Channel e Shipping Profile usando o script de hidratação`);
    console.log(`   2. Crie as categorias no Admin antes do import`);
    console.log(`   3. Valide o CSV localmente antes de subir para produção`);
  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    process.exit(1);
  }
}
