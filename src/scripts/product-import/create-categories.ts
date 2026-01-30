/**
 * Script para criar categorias de produtos baseado na estrutura do CSV
 *
 * Este script lê o CSV sanitizado, extrai todas as categorias únicas
 * e cria a hierarquia de categorias no Medusa antes do import
 *
 * Uso:
 * npx medusa exec ./src/scripts/product-import/create-categories.ts <csv-file>
 */

import { ExecArgs } from '@medusajs/framework/types';
import { createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parse linha CSV respeitando aspas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Lê CSV e extrai categorias únicas (apenas handles finais)
 * O CSV já vem sanitizado com apenas o handle da categoria filho
 */
function extractCategoriesFromCSV(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    return new Set();
  }

  const headers = parseCSVLine(lines[0]);
  const categoryIndex = headers.findIndex((h) => h === 'Product Category 1');

  if (categoryIndex === -1) {
    return new Set();
  }

  const categories = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const categoryHandle = values[categoryIndex]?.trim();

    if (categoryHandle) {
      categories.add(categoryHandle);
    }
  }

  return categories;
}

export default async function createCategories({ container, args }: ExecArgs) {
  const [csvPath] = args;

  if (!csvPath) {
    console.error('❌ Erro: Caminho do arquivo CSV não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/create-categories.ts <csv-file>');
    process.exit(1);
  }

  const csvFile = path.resolve(process.cwd(), csvPath);

  if (!fs.existsSync(csvFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${csvFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo CSV: ${csvFile}`);

  try {
    const categoryHandles = extractCategoriesFromCSV(csvFile);

    if (categoryHandles.size === 0) {
      console.warn('⚠️  Nenhuma categoria encontrada no CSV');
      console.log('💡 Certifique-se de que a coluna "Product Category 1" existe e está preenchida');
      return;
    }

    console.log(`✅ Encontradas ${categoryHandles.size} categorias únicas:`);
    Array.from(categoryHandles).forEach((handle) => {
      console.log(`   - ${handle}`);
    });

    // Verifica categorias existentes
    const productModule = container.resolve('product');
    const existingCategories = await productModule.listProductCategories({});
    const existingHandles = new Set(
      existingCategories.map((cat: { handle?: string | null }) => cat.handle).filter((h): h is string => !!h),
    );

    console.log(`\n🔍 Verificando categorias existentes...`);
    console.log(`   Encontradas ${existingCategories.length} categorias no banco`);

    const categoriesToCreate = Array.from(categoryHandles).filter((handle) => !existingHandles.has(handle));

    if (categoriesToCreate.length === 0) {
      console.log(`\n✅ Todas as categorias já existem no banco!`);
      return;
    }

    console.log(`\n📝 Criando ${categoriesToCreate.length} novas categorias...`);

    // Agrupa categorias para criar em batch
    const categoriesToCreateBatch = categoriesToCreate.map((handle) => {
      // Converte handle para nome legível (capitaliza palavras)
      const name = handle
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return {
        name,
        handle,
        is_active: true,
      };
    });

    if (categoriesToCreateBatch.length > 0) {
      try {
        const { result } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: categoriesToCreateBatch,
          },
        });

        if (result && Array.isArray(result)) {
          console.log(`\n✅ ${result.length} categorias criadas com sucesso!`);
          result.forEach((cat: { name?: string | null; handle?: string | null }) => {
            console.log(`   ✅ ${cat.name || ''} (${cat.handle || ''})`);
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao criar categorias em batch:`, errorMessage);

        // Fallback: tenta criar uma por uma
        console.log(`\n⚠️  Tentando criar categorias individualmente...`);
        for (const category of categoriesToCreateBatch) {
          try {
            await createProductCategoriesWorkflow(container).run({
              input: {
                product_categories: [category],
              },
            });
            console.log(`   ✅ Criada: ${category.name} (${category.handle})`);
          } catch (individualError: unknown) {
            const individualErrorMessage =
              individualError instanceof Error ? individualError.message : String(individualError);
            console.error(`   ❌ Erro ao criar ${category.handle}:`, individualErrorMessage);

            // Se categoria já existe, continua
            if (
              individualErrorMessage.includes('already exists') ||
              individualErrorMessage.includes('unique') ||
              individualErrorMessage.includes('duplicate')
            ) {
              console.log(`   ⚠️  Categoria ${category.handle} já existe, pulando...`);
            }
          }
        }
      }
    }

    console.log(`\n✅ Processo concluído!`);
    console.log(`\n💡 PRÓXIMOS PASSOS:`);
    console.log(`   1. Verifique as categorias no Admin: Settings > Product Categories`);
    console.log(`   2. Ajuste nomes/handles se necessário`);
    console.log(`   3. Crie hierarquias (pais/filhos) manualmente se necessário`);
    console.log(`   4. Execute o import do CSV`);
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    process.exit(1);
  }
}
