/**
 * Script Node.js standalone para executar ETL sem depender do Medusa
 * Executa: node src/scripts/product-import/run-etl.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuração
const INPUT_EXCEL = path.resolve(__dirname, '../../utils/product-import-template_disfruta_ES_V1.xlsx');
const OUTPUT_CSV = path.resolve(__dirname, '../../utils/product-import-CHECK-FINAL.csv');
const OUTPUT_TRANSLATIONS = path.resolve(__dirname, '../../utils/translations-ca-template.csv');
const OUTPUT_CATEGORIES = path.resolve(__dirname, '../../utils/category-map.json');

// Funções auxiliares
function generateHandle(title) {
  if (!title || typeof title !== 'string') return '';
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

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (['true', 'verdadeiro', 'sim', 'yes', '1'].includes(lower)) return 'true';
    if (['false', 'falso', 'não', 'no', '0'].includes(lower)) return 'false';
  }
  if (typeof value === 'number') return value === 1 ? 'true' : 'false';
  return 'false';
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string') {
    let cleaned = value.trim().replace(/[^\d.,-]/g, '');
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num.toFixed(2);
  }
  return '';
}

function extractCategoryHandle(categoryPath) {
  if (!categoryPath || typeof categoryPath !== 'string') return '';

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

console.log('🚀 Iniciando processamento ETL...\n');

// 1. Ler Excel
if (!fs.existsSync(INPUT_EXCEL)) {
  console.error(`❌ Arquivo não encontrado: ${INPUT_EXCEL}`);
  process.exit(1);
}

console.log(`📖 Lendo Excel: ${INPUT_EXCEL}`);
const workbook = XLSX.readFile(INPUT_EXCEL);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

if (rawData.length === 0) {
  console.error('❌ Excel está vazio');
  process.exit(1);
}

console.log(`✅ ${rawData.length} linhas encontradas\n`);

// 2. Processar CSV sanitizado
console.log('📝 Processando CSV sanitizado...');
const rawHeaders = Object.keys(rawData[0]);
const normalizedHeaders = rawHeaders.map((h) => h.trim());
const sanitizedRows = [];

for (const row of rawData) {
  const sanitizedRow = {};

  for (const header of OFFICIAL_HEADERS) {
    let value = '';
    const originalIndex = normalizedHeaders.findIndex(
      (h) => h === header || (h === 'Product Category' && header === 'Product Category 1'),
    );

    if (originalIndex !== -1) {
      const originalHeader = rawHeaders[originalIndex];
      value = row[originalHeader];
    }

    if (header === 'Product Handle') {
      value = value || generateHandle(String(row['Product Title'] || ''));
    } else if (header === 'Product Category 1') {
      value = extractCategoryHandle(String(row['Product Category'] || value || ''));
    } else if (['Product Discountable', 'Variant Allow Backorder', 'Variant Manage Inventory'].includes(header)) {
      value = normalizeBoolean(value);
    } else if (['Variant Price EUR', 'Variant Price USD'].includes(header)) {
      value = normalizePrice(value);
    } else if (header === 'Variant Barcode') {
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

  sanitizedRow['Shipping Profile Id'] = 'REQ_HIDRATACAO';
  sanitizedRow['Product Sales Channel 1'] = 'REQ_HIDRATACAO';
  sanitizedRows.push(sanitizedRow);
}

// Salvar CSV
const csvHeaders = [...OFFICIAL_HEADERS, 'Shipping Profile Id', 'Product Sales Channel 1'];
const csvContent = [
  csvHeaders.join(','),
  ...sanitizedRows.map((row) =>
    csvHeaders
      .map((h) => {
        const v = String(row[h] || '');
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
      })
      .join(','),
  ),
].join('\n');

fs.writeFileSync(OUTPUT_CSV, csvContent, 'utf-8');
console.log(`✅ CSV sanitizado salvo: ${OUTPUT_CSV}`);
console.log(`   - Linhas: ${sanitizedRows.length}`);
console.log(`   - Handles gerados: ${sanitizedRows.filter((r) => r['Product Handle']).length}`);
console.log(`   - Categorias: ${sanitizedRows.filter((r) => r['Product Category 1']).length}\n`);

// 3. Gerar template de traduções
console.log('📝 Gerando template de traduções...');
const uniqueProducts = new Map();
for (const row of rawData) {
  const title = String(row['Product Title'] || '').trim();
  if (title && !uniqueProducts.has(title)) {
    uniqueProducts.set(title, {
      handle: generateHandle(title),
      title_es: title,
      description_es: String(row['Product Description'] || '').trim(),
    });
  }
}

const translationsContent = [
  'product_handle,product_title_es,product_title_ca,product_description_ca',
  ...Array.from(uniqueProducts.values()).map((p) =>
    [
      p.handle,
      p.title_es,
      '', // product_title_ca - vazio para preencher
      '', // product_description_ca - vazio para preencher
    ]
      .map((v) => {
        const str = String(v);
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(','),
  ),
].join('\n');

fs.writeFileSync(OUTPUT_TRANSLATIONS, translationsContent, 'utf-8');
console.log(`✅ Template de traduções salvo: ${OUTPUT_TRANSLATIONS}`);
console.log(`   - Produtos únicos: ${uniqueProducts.size}\n`);

// 4. Extrair mapa de categorias
console.log('📝 Extraindo mapa de categorias...');
const categoryMap = new Map();

for (const row of rawData) {
  let categoryPath = String(row['Product Category'] || '').trim();
  if (!categoryPath || !categoryPath.includes('»')) continue;

  // Primeiro, remove partes após pipe (|) se houver
  if (categoryPath.includes('|')) {
    const partsByPipe = categoryPath.split('|');
    categoryPath = partsByPipe[0].trim(); // Pega apenas a primeira parte antes do pipe
  }

  const parts = categoryPath.split('»').map((p) => p.trim());
  if (parts.length >= 2) {
    const parentName = parts[0];
    const childName = parts[parts.length - 1];
    const parentHandle = generateHandle(parentName);
    const childHandle = generateHandle(childName);

    if (!categoryMap.has(parentHandle)) {
      categoryMap.set(parentHandle, { name: parentName, children: new Map() });
    }
    const parent = categoryMap.get(parentHandle);
    if (!parent.children.has(childHandle)) {
      parent.children.set(childHandle, { name: childName, handle_filho: childHandle });
    }
  }
}

const categoryTree = Array.from(categoryMap.entries())
  .map(([handle, data]) => ({
    parent: data.name,
    handle_pai: handle,
    children: Array.from(data.children.values()),
  }))
  .sort((a, b) => a.parent.localeCompare(b.parent));

fs.writeFileSync(OUTPUT_CATEGORIES, JSON.stringify(categoryTree, null, 2), 'utf-8');
console.log(`✅ Mapa de categorias salvo: ${OUTPUT_CATEGORIES}`);
console.log(`   - Categorias PAI: ${categoryTree.length}`);
console.log(`   - Total FILHOS: ${categoryTree.reduce((sum, cat) => sum + cat.children.length, 0)}\n`);

console.log('✅ Processamento concluído!');
console.log('\n📋 Arquivos gerados:');
console.log(`   1. ${OUTPUT_CSV}`);
console.log(`   2. ${OUTPUT_TRANSLATIONS}`);
console.log(`   3. ${OUTPUT_CATEGORIES}`);
