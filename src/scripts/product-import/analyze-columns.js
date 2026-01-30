/**
 * Script para analisar e comparar colunas entre Excel do cliente e template MedusaJS
 * Executa: node src/scripts/product-import/analyze-columns.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Lê template oficial do MedusaJS
const templateFile = path.resolve(process.cwd(), 'src/utils/product-import-template (1).csv');
const templateContent = fs.readFileSync(templateFile, 'utf-8');
const templateHeaders = templateContent.split('\n')[0].split(',').map(h => h.trim());

// Lê Excel do cliente
const excelFile = path.resolve(process.cwd(), 'src/utils/product-import-template_disfruta_ES_V1.xlsx');
const workbook = XLSX.readFile(excelFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const clientData = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 });
const clientHeaders = clientData[0].map(h => String(h).trim());

console.log('='.repeat(80));
console.log('📊 MAPA DE DIFERENÇAS: Cliente vs Template MedusaJS');
console.log('='.repeat(80));

console.log(`\n📋 TEMPLATE MEDUSAJS (${templateHeaders.length} colunas):`);
templateHeaders.forEach((h, i) => {
  console.log(`   ${i + 1}. ${h}`);
});

console.log(`\n📋 CLIENTE DISFRUTA (${clientHeaders.length} colunas):`);
clientHeaders.forEach((h, i) => {
  console.log(`   ${i + 1}. ${h}`);
});

// Análise de diferenças
const templateSet = new Set(templateHeaders);
const clientSet = new Set(clientHeaders);

const onlyInTemplate = templateHeaders.filter(h => !clientSet.has(h));
const onlyInClient = clientHeaders.filter(h => !templateSet.has(h));
const inBoth = templateHeaders.filter(h => clientSet.has(h));

console.log('\n' + '='.repeat(80));
console.log('🔍 ANÁLISE DE DIFERENÇAS');
console.log('='.repeat(80));

console.log(`\n✅ COLUNAS EM COMUM (${inBoth.length}):`);
inBoth.forEach((h, i) => {
  console.log(`   ${i + 1}. ${h}`);
});

console.log(`\n⚠️  COLUNAS APENAS NO TEMPLATE MEDUSAJS (${onlyInTemplate.length}):`);
if (onlyInTemplate.length > 0) {
  onlyInTemplate.forEach((h, i) => {
    console.log(`   ${i + 1}. ${h} ❌ (Faltando no cliente)`);
  });
} else {
  console.log('   Nenhuma - todas as colunas do template existem no cliente');
}

console.log(`\n🔴 COLUNAS APENAS NO CLIENTE (${onlyInClient.length}):`);
if (onlyInClient.length > 0) {
  onlyInClient.forEach((h, i) => {
    console.log(`   ${i + 1}. ${h} ⚠️  (Será removida ou mapeada)`);
  });
} else {
  console.log('   Nenhuma - cliente não tem colunas extras');
}

// Mapeamento necessário
console.log('\n' + '='.repeat(80));
console.log('🗺️  MAPEAMENTO NECESSÁRIO');
console.log('='.repeat(80));

const mapping = {
  'Product Category': 'Product Category 1', // Renomeação necessária
  'Shipping Profile Id': 'Shipping Profile Id', // Mantém (para hidratação)
  'Product Sales Channel 1': 'Product Sales Channel 1', // Mantém (para hidratação)
};

console.log('\n📝 Transformações necessárias:');
console.log('   1. "Product Category" → "Product Category 1" (renomeação)');
console.log('   2. "Shipping Profile Id" → Mantém (será hidratado)');
console.log('   3. "Product Sales Channel 1" → Mantém (será hidratado)');

// Colunas que precisam de transformação
const needsTransformation = [
  'Product Handle', // Geração automática
  'Product Category', // Extração de hierarquia
  'Variant Price EUR', // Normalização de formato
  'Variant Price USD', // Normalização de formato
  'Product Discountable', // Normalização booleana
  'Variant Allow Backorder', // Normalização booleana
  'Variant Manage Inventory', // Normalização booleana
  'Variant Barcode', // Preservação como string
];

console.log('\n🔧 COLUNAS QUE PRECISAM DE TRANSFORMAÇÃO:');
needsTransformation.forEach((col, i) => {
  const existsInClient = clientSet.has(col);
  const existsInTemplate = templateSet.has(col) || mapping[col];
  console.log(`   ${i + 1}. ${col}`);
  console.log(`      Cliente: ${existsInClient ? '✅' : '❌'}`);
  console.log(`      Template: ${existsInTemplate ? '✅' : '❌'}`);
  if (col === 'Product Category') {
    console.log(`      Ação: Extrair handle do filho da hierarquia`);
  } else if (col.includes('Price')) {
    console.log(`      Ação: Normalizar para formato US (10.50)`);
  } else if (col.includes('Discountable') || col.includes('Backorder') || col.includes('Inventory')) {
    console.log(`      Ação: Normalizar para true/false`);
  } else if (col === 'Product Handle') {
    console.log(`      Ação: Gerar automaticamente se vazio`);
  } else if (col === 'Variant Barcode') {
    console.log(`      Ação: Preservar como string (evitar notação científica)`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ RESUMO');
console.log('='.repeat(80));
console.log(`Total colunas Template: ${templateHeaders.length}`);
console.log(`Total colunas Cliente: ${clientHeaders.length}`);
console.log(`Colunas em comum: ${inBoth.length}`);
console.log(`Colunas apenas Template: ${onlyInTemplate.length}`);
console.log(`Colunas apenas Cliente: ${onlyInClient.length}`);
console.log(`Colunas para transformar: ${needsTransformation.length}`);
