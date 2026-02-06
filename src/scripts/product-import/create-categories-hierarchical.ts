/**
 * Script para criar categorias com hierarquia completa (pai/filho)
 *
 * Este script lê o Excel ORIGINAL do cliente para extrair a hierarquia completa
 * e cria primeiro as categorias PAI, depois as FILHO com parent_category_id
 *
 * Uso:
 * npx medusa exec ./src/scripts/product-import/create-categories-hierarchical.ts <excel-file>
 */

import { ExecArgs } from '@medusajs/framework/types';
import { createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';
import type { ProductCategoryDTO } from '@medusajs/types';
import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

interface CategoryHierarchy {
  parent: {
    name: string;
    handle: string;
  };
  child: {
    name: string;
    handle: string;
  };
}

/**
 * Gera handle slug
 */
function generateHandle(name: string): string {
  return name
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

/**
 * Extrai hierarquia completa do Excel original
 */
function extractHierarchyFromExcel(filePath: string): Map<string, CategoryHierarchy> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  type ExcelRow = {
    'Product Category'?: string;
    [key: string]: unknown;
  };

  const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  }) as ExcelRow[];

  const hierarchyMap = new Map<string, CategoryHierarchy>();

  for (const row of rawData) {
    const categoryPath = String(row['Product Category'] || '').trim();

    if (!categoryPath || !categoryPath.includes('»')) {
      continue;
    }

    // Separa hierarquia: "Pai » Filho"
    const parts = categoryPath.split('»').map((p) => p.trim());

    if (parts.length >= 2) {
      const parentName = parts[0];
      const childName = parts[parts.length - 1]; // Pega o último (pode ter mais níveis)

      const parentHandle = generateHandle(parentName);
      const childHandle = generateHandle(childName);

      // Usa childHandle como chave (único por produto)
      if (!hierarchyMap.has(childHandle)) {
        hierarchyMap.set(childHandle, {
          parent: {
            name: parentName,
            handle: parentHandle,
          },
          child: {
            name: childName,
            handle: childHandle,
          },
        });
      }
    }
  }

  return hierarchyMap;
}

export default async function createCategoriesHierarchical({ container, args }: ExecArgs) {
  const [excelPath] = args;

  if (!excelPath) {
    console.error('❌ Erro: Caminho do arquivo Excel não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/create-categories-hierarchical.ts <excel-file>');
    process.exit(1);
  }

  const excelFile = path.resolve(process.cwd(), excelPath);

  if (!fs.existsSync(excelFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${excelFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo Excel original: ${excelFile}`);

  try {
    const hierarchyMap = extractHierarchyFromExcel(excelFile);

    if (hierarchyMap.size === 0) {
      console.warn('⚠️  Nenhuma hierarquia de categoria encontrada no Excel');
      return;
    }

    console.log(`✅ Encontradas ${hierarchyMap.size} categorias filho com hierarquia`);

    const productModule = container.resolve('product');

    // Coleta todos os pais e filhos únicos
    const uniqueParents = new Map<string, { name: string; handle: string }>();
    const uniqueChildren = new Map<string, CategoryHierarchy>();

    hierarchyMap.forEach((hierarchy, childHandle) => {
      uniqueParents.set(hierarchy.parent.handle, hierarchy.parent);
      uniqueChildren.set(childHandle, hierarchy);
    });

    console.log(`\n📊 Estrutura encontrada:`);
    console.log(`   - Categorias PAI: ${uniqueParents.size}`);
    console.log(`   - Categorias FILHO: ${uniqueChildren.size}`);

    // Verifica categorias existentes
    const existingCategories = await productModule.listProductCategories({});
    const existingHandles = new Map<string, ProductCategoryDTO>();

    existingCategories.forEach((cat: ProductCategoryDTO) => {
      if (cat.handle) {
        existingHandles.set(cat.handle, cat);
      }
    });

    console.log(`\n🔍 Verificando categorias existentes...`);
    console.log(`   Encontradas ${existingCategories.length} categorias no banco`);

    // 1. Cria categorias PAI que não existem
    const parentsToCreate = Array.from(uniqueParents.values()).filter((parent) => !existingHandles.has(parent.handle));

    if (parentsToCreate.length > 0) {
      console.log(`\n📝 Criando ${parentsToCreate.length} categorias PAI...`);

      try {
        const { result: createdParents } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: parentsToCreate.map((p) => ({
              name: p.name,
              handle: p.handle,
              is_active: true,
            })),
          },
        });

        // Atualiza mapa de existentes
        if (createdParents && Array.isArray(createdParents)) {
          createdParents.forEach((cat: ProductCategoryDTO) => {
            if (cat.handle) {
              existingHandles.set(cat.handle, cat);
              console.log(`   ✅ Criada PAI: ${cat.name || ''} (${cat.handle})`);
            }
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao criar categorias pai:`, errorMessage);
        // Tenta criar uma por uma
        for (const parent of parentsToCreate) {
          try {
            const { result } = await createProductCategoriesWorkflow(container).run({
              input: {
                product_categories: [
                  {
                    name: parent.name,
                    handle: parent.handle,
                    is_active: true,
                  },
                ],
              },
            });
            if (result && Array.isArray(result) && result[0]) {
              const cat = result[0] as ProductCategoryDTO;
              if (cat.handle) {
                existingHandles.set(cat.handle, cat);
                console.log(`   ✅ Criada PAI: ${cat.name || ''} (${cat.handle})`);
              }
            }
          } catch (individualError: unknown) {
            const individualErrorMessage =
              individualError instanceof Error ? individualError.message : String(individualError);
            if (individualErrorMessage.includes('already exists') || individualErrorMessage.includes('unique')) {
              console.log(`   ⚠️  PAI ${parent.handle} já existe, pulando...`);
            } else {
              console.error(`   ❌ Erro ao criar ${parent.handle}:`, individualErrorMessage);
            }
          }
        }
      }
    } else {
      console.log(`\n✅ Todas as categorias PAI já existem!`);
    }

    // 2. Cria categorias FILHO com parent_category_id
    const childrenToCreate = Array.from(uniqueChildren.values()).filter(
      (hierarchy) => !existingHandles.has(hierarchy.child.handle),
    );

    if (childrenToCreate.length > 0) {
      console.log(`\n📝 Criando ${childrenToCreate.length} categorias FILHO...`);

      for (const hierarchy of childrenToCreate) {
        try {
          const parentCategory = existingHandles.get(hierarchy.parent.handle);

          if (!parentCategory) {
            console.warn(`   ⚠️  PAI ${hierarchy.parent.handle} não encontrado, criando filho sem pai...`);
          }

          const { result } = await createProductCategoriesWorkflow(container).run({
            input: {
              product_categories: [
                {
                  name: hierarchy.child.name,
                  handle: hierarchy.child.handle,
                  is_active: true,
                  parent_category_id: parentCategory?.id,
                },
              ],
            },
          });

          if (result && Array.isArray(result) && result[0]) {
            const cat = result[0] as ProductCategoryDTO;
            if (cat.handle) {
              existingHandles.set(cat.handle, cat);
              console.log(`   ✅ Criada FILHO: ${cat.name || ''} (${cat.handle}) → PAI: ${hierarchy.parent.name}`);
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('already exists') || errorMessage.includes('unique')) {
            console.log(`   ⚠️  FILHO ${hierarchy.child.handle} já existe, pulando...`);
          } else {
            console.error(`   ❌ Erro ao criar ${hierarchy.child.handle}:`, errorMessage);
          }
        }
      }
    } else {
      console.log(`\n✅ Todas as categorias FILHO já existem!`);
    }

    console.log(`\n✅ Processo concluído!`);
    console.log(`\n💡 PRÓXIMOS PASSOS:`);
    console.log(`   1. Verifique as categorias no Admin: Settings > Product Categories`);
    console.log(`   2. Confirme que a hierarquia está correta (pais → filhos)`);
    console.log(`   3. Execute o import do CSV sanitizado`);
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    process.exit(1);
  }
}
