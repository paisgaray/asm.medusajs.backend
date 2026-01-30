/**
 * Standalone Dry Run Script - Não requer ambiente Medusa
 * Executa: node src/scripts/product-import/dry-run-standalone.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function generateHandle(title) {
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

function normalizeBoolean(value) {
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

function normalizePrice(value) {
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

function extractCategoryHandle(categoryPath) {
  if (!categoryPath || typeof categoryPath !== 'string') {
    return '';
  }
  const parts = categoryPath.split('»').map((p) => p.trim());
  const lastCategory = parts[parts.length - 1];
  return generateHandle(lastCategory);
}

const inputFile = path.resolve(process.cwd(), 'src/utils/product-import-template_disfruta_ES_V1.xlsx');

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

  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  if (rawData.length === 0) {
    console.error('❌ Erro: Arquivo Excel está vazio');
    process.exit(1);
  }

  console.log(`✅ Encontradas ${rawData.length} linhas de dados\n`);

  // Processa apenas as primeiras 3 linhas
  const previewRows = rawData.slice(0, 3);
  const sanitizedRows = [];

  for (let i = 0; i < previewRows.length; i++) {
    const row = previewRows[i];
    const sanitizedRow = {};

    // Campos críticos para validação
    const title = row['Product Title'] || '';
    const categoryPath = row['Product Category'] || '';
    const priceEUR = row['Variant Price EUR'] || '';
    const manageInventory = row['Variant Manage Inventory'] || '';

    sanitizedRow['Product Handle'] = generateHandle(String(title));
    sanitizedRow['Product Title'] = title;
    sanitizedRow['Product Category 1'] = extractCategoryHandle(String(categoryPath));
    sanitizedRow['Variant Price EUR'] = normalizePrice(priceEUR);
    sanitizedRow['Variant Manage Inventory'] = normalizeBoolean(manageInventory);
    sanitizedRow['Product Category (Original)'] = categoryPath; // Para comparação

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
  console.log(
    `   - Product Handle: ${sanitizedRows[0]['Product Handle'] ? '✅ Gerado: ' + sanitizedRows[0]['Product Handle'] : '❌ Vazio'}`,
  );
  console.log(
    `   - Product Category 1: ${sanitizedRows[0]['Product Category 1'] ? '✅ ' + sanitizedRows[0]['Product Category 1'] : '❌ Vazio'}`,
  );
  console.log(
    `   - Variant Price EUR: ${sanitizedRows[0]['Variant Price EUR'] ? '✅ ' + sanitizedRows[0]['Variant Price EUR'] : '⚠️  Vazio'}`,
  );
  console.log(
    `   - Variant Manage Inventory: ${sanitizedRows[0]['Variant Manage Inventory'] ? '✅ ' + sanitizedRows[0]['Variant Manage Inventory'] : '⚠️  Vazio'}`,
  );

  console.log(`\n💡 Comparação:`);
  console.log(`   Categoria Original: "${sanitizedRows[0]['Product Category (Original)']}"`);
  console.log(`   Categoria Sanitizada: "${sanitizedRows[0]['Product Category 1']}"`);
} catch (error) {
  console.error('❌ Erro ao processar arquivo:', error);
  process.exit(1);
}
