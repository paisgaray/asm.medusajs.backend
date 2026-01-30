/**
 * Script para gerar template de traduções Catalão a partir do Excel original
 *
 * Este script lê o Excel do cliente e gera um CSV template com:
 * - Product Handle (gerado)
 * - Product Title ES (original para referência)
 * - Product Title CA (vazio, para preencher)
 * - Product Description CA (vazio, para preencher)
 *
 * Uso:
 * npx medusa exec ./src/scripts/product-import/generate-translation-template.ts <input-excel> <output-csv>
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

export default async function generateTranslationTemplate({ args }: ExecArgs) {
  const [inputPath, outputPath] = args;

  if (!inputPath) {
    console.error('❌ Erro: Caminho do arquivo Excel não fornecido');
    console.log(
      'Uso: npx medusa exec ./src/scripts/product-import/generate-translation-template.ts <input-excel> <output-csv>',
    );
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputPath);
  const outputFile = outputPath
    ? path.resolve(process.cwd(), outputPath)
    : path.resolve(process.cwd(), 'src/utils/translations-ca-template.csv');

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
      raw: false,
    });

    if (rawData.length === 0) {
      console.error('❌ Erro: Arquivo Excel está vazio ou não contém dados');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${rawData.length} linhas de dados`);

    // Extrai produtos únicos (por título, para evitar duplicatas de variantes)
    const uniqueProducts = new Map<string, { handle: string; title: string; description: string }>();

    for (const row of rawData) {
      const title = String(row['Product Title'] || '').trim();
      const description = String(row['Product Description'] || '').trim();

      if (title && !uniqueProducts.has(title)) {
        const handle = generateHandle(title);
        uniqueProducts.set(title, {
          handle,
          title,
          description,
        });
      }
    }

    console.log(`✅ Encontrados ${uniqueProducts.size} produtos únicos`);

    // Gera CSV
    const csvRows = Array.from(uniqueProducts.values()).map((product) => {
      const handle = product.handle || '';
      const titleES = product.title || '';
      const descriptionES = product.description || '';

      // Escapa valores que contêm vírgulas ou aspas
      const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      return [
        escapeCSV(handle),
        escapeCSV(titleES),
        '', // Title CA - vazio
        escapeCSV(descriptionES),
        '', // Description CA - vazio
      ].join(',');
    });

    const csvContent = [
      'Product Handle,Product Title ES,Product Title CA,Product Description ES,Product Description CA',
      ...csvRows,
    ].join('\n');

    // Salva arquivo
    fs.writeFileSync(outputFile, csvContent, 'utf-8');

    console.log(`✅ Template de traduções salvo em: ${outputFile}`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Produtos únicos: ${uniqueProducts.size}`);
    console.log(`   - Handles gerados: ${Array.from(uniqueProducts.values()).filter((p) => p.handle).length}`);
    console.log(`\n💡 PRÓXIMOS PASSOS:`);
    console.log(`   1. Abra o arquivo gerado`);
    console.log(`   2. Preencha as colunas "Product Title CA" e "Product Description CA"`);
    console.log(`   3. Use este arquivo no script translate-catalan.ts`);
  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    process.exit(1);
  }
}
