/**
 * Script para extrair mapa de categorias do Excel e gerar JSON
 * 
 * Uso: npx medusa exec ./src/scripts/product-import/extract-category-map.ts <input-excel> <output-json>
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ExecArgs } from '@medusajs/framework/types';

interface CategoryChild {
  name: string;
  handle_filho: string;
}

interface CategoryParent {
  parent: string;
  handle_pai: string;
  children: CategoryChild[];
}

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

export default async function extractCategoryMap({
  args,
}: ExecArgs) {
  const [inputPath, outputPath] = args;

  if (!inputPath) {
    console.error('❌ Erro: Caminho do arquivo Excel não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/extract-category-map.ts <input-excel> <output-json>');
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputPath);
  const outputFile = outputPath 
    ? path.resolve(process.cwd(), outputPath)
    : path.resolve(process.cwd(), 'src/utils/category-map.json');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo Excel: ${inputFile}`);

  try {
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false
    });

    if (rawData.length === 0) {
      console.error('❌ Erro: Arquivo Excel está vazio');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${rawData.length} linhas de dados`);

    // Mapa para armazenar hierarquia: parent -> children
    const categoryMap = new Map<string, Map<string, CategoryChild>>();

    for (const row of rawData) {
      let categoryPath = String(row['Product Category'] || '').trim();
      
      if (!categoryPath || !categoryPath.includes('»')) {
        continue;
      }

      // Primeiro, remove partes após pipe (|) se houver
      if (categoryPath.includes('|')) {
        const partsByPipe = categoryPath.split('|');
        categoryPath = partsByPipe[0].trim(); // Pega apenas a primeira parte antes do pipe
      }

      // Separa hierarquia: "Pai » Filho"
      const parts = categoryPath.split('»').map(p => p.trim());
      
      if (parts.length >= 2) {
        const parentName = parts[0];
        const childName = parts[parts.length - 1];
        
        const parentHandle = generateHandle(parentName);
        const childHandle = generateHandle(childName);

        if (!categoryMap.has(parentHandle)) {
          categoryMap.set(parentHandle, new Map());
        }

        const childrenMap = categoryMap.get(parentHandle)!;
        if (!childrenMap.has(childHandle)) {
          childrenMap.set(childHandle, {
            name: childName,
            handle_filho: childHandle,
          });
        }
      }
    }

    // Converte para array JSON
    const categoryTree: CategoryParent[] = [];

    categoryMap.forEach((childrenMap, parentHandle) => {
      // Encontra o nome do pai (primeira ocorrência)
      let parentName = '';
      for (const row of rawData) {
        const categoryPath = String(row['Product Category'] || '').trim();
        if (categoryPath.includes('»')) {
          const parts = categoryPath.split('»').map(p => p.trim());
          if (parts.length >= 2 && generateHandle(parts[0]) === parentHandle) {
            parentName = parts[0];
            break;
          }
        }
      }

      categoryTree.push({
        parent: parentName || parentHandle,
        handle_pai: parentHandle,
        children: Array.from(childrenMap.values()),
      });
    });

    // Ordena por nome do pai
    categoryTree.sort((a, b) => a.parent.localeCompare(b.parent));

    // Salva JSON
    const jsonContent = JSON.stringify(categoryTree, null, 2);
    fs.writeFileSync(outputFile, jsonContent, 'utf-8');

    console.log(`✅ Mapa de categorias salvo em: ${outputFile}`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Categorias PAI: ${categoryTree.length}`);
    console.log(`   - Total de categorias FILHO: ${categoryTree.reduce((sum, cat) => sum + cat.children.length, 0)}`);
    
    console.log(`\n📋 Estrutura de Categorias:`);
    categoryTree.forEach((parent, index) => {
      console.log(`\n   ${index + 1}. ${parent.parent} (${parent.handle_pai})`);
      parent.children.forEach((child, childIndex) => {
        console.log(`      ${childIndex + 1}.1. ${child.name} (${child.handle_filho})`);
      });
    });

  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    process.exit(1);
  }
}
