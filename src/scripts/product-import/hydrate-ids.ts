/**
 * Script para hidratar CSV sanitizado com IDs de ambiente específico
 * 
 * Este script preenche as colunas:
 * - Shipping Profile Id
 * - Product Sales Channel 1
 * 
 * Com os IDs corretos do ambiente (Local/Dev/Prod)
 * 
 * Uso:
 * npx medusa exec ./src/scripts/product-import/hydrate-ids.ts <input-csv> <output-csv> <sales-channel-id> <shipping-profile-id>
 * 
 * Ou interativo:
 * npx medusa exec ./src/scripts/product-import/hydrate-ids.ts <input-csv> <output-csv>
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExecArgs } from '@medusajs/framework/types';

interface CSVRow {
  [key: string]: string;
}

/**
 * Lê CSV e retorna array de objetos
 */
function readCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return rows;
}

/**
 * Parse uma linha CSV respeitando aspas e vírgulas
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
        i++; // Pula próximo caractere
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
 * Escreve array de objetos para CSV
 */
function writeCSV(filePath: string, rows: CSVRow[], headers: string[]): void {
  const csvRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header] || '';
      // Escapa valores que contêm vírgulas ou aspas
      if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
      return String(value);
    });
  });

  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');

  fs.writeFileSync(filePath, csvContent, 'utf-8');
}

export default async function hydrateIDs({
  container,
  args,
}: ExecArgs) {
  const [inputPath, outputPath, salesChannelId, shippingProfileId] = args;

  if (!inputPath) {
    console.error('❌ Erro: Caminho do arquivo CSV não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/hydrate-ids.ts <input-csv> <output-csv> [sales-channel-id] [shipping-profile-id]');
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputPath);
  const outputFile = outputPath 
    ? path.resolve(process.cwd(), outputPath)
    : inputFile.replace('.csv', '_hydrated.csv');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo CSV: ${inputFile}`);

  try {
    const rows = readCSV(inputFile);
    
    if (rows.length === 0) {
      console.error('❌ Erro: CSV está vazio');
      process.exit(1);
    }

    const headers = Object.keys(rows[0]);
    
    // Se IDs não foram fornecidos, tenta buscar do banco
    let finalSalesChannelId = salesChannelId;
    let finalShippingProfileId = shippingProfileId;

    if (!finalSalesChannelId || !finalShippingProfileId) {
      console.log('🔍 Buscando IDs do banco de dados...');
      
      try {
        // Busca Sales Channel
        if (!finalSalesChannelId) {
          try {
            const salesChannelModule = container.resolve('salesChannel');
            const salesChannels = await salesChannelModule.listSalesChannels({});
            
            if (salesChannels && salesChannels.length > 0) {
              // Tenta encontrar "Default" ou pega o primeiro
              const defaultChannel = salesChannels.find((sc: any) => 
                sc.name?.toLowerCase().includes('default') || 
                sc.is_default === true
              ) || salesChannels[0];
              
              finalSalesChannelId = defaultChannel.id;
              console.log(`✅ Sales Channel encontrado: ${defaultChannel.name} (${finalSalesChannelId})`);
            } else {
              console.warn('⚠️  Nenhum Sales Channel encontrado no banco');
            }
          } catch (error: any) {
            console.warn(`⚠️  Erro ao buscar Sales Channel: ${error.message}`);
          }
        }

        // Busca Shipping Profile
        if (!finalShippingProfileId) {
          try {
            const shippingProfileModule = container.resolve('shippingProfile');
            const shippingProfiles = await shippingProfileModule.listShippingProfiles({});
            
            if (shippingProfiles && shippingProfiles.length > 0) {
              // Tenta encontrar "default" ou pega o primeiro
              const defaultProfile = shippingProfiles.find((sp: any) => 
                sp.name?.toLowerCase().includes('default')
              ) || shippingProfiles[0];
              
              finalShippingProfileId = defaultProfile.id;
              console.log(`✅ Shipping Profile encontrado: ${defaultProfile.name} (${finalShippingProfileId})`);
            } else {
              console.warn('⚠️  Nenhum Shipping Profile encontrado no banco');
            }
          } catch (error: any) {
            console.warn(`⚠️  Erro ao buscar Shipping Profile: ${error.message}`);
          }
        }
      } catch (error) {
        console.warn('⚠️  Erro ao buscar IDs do banco:', error);
        console.log('💡 Você pode fornecer os IDs manualmente como argumentos');
      }
    }

    if (!finalSalesChannelId || !finalShippingProfileId) {
      console.error('❌ Erro: IDs de Sales Channel e Shipping Profile são obrigatórios');
      console.log('\n💡 Para obter os IDs manualmente, execute estas queries SQL:');
      console.log('   SELECT id, name FROM sales_channel;');
      console.log('   SELECT id, name FROM shipping_profile;');
      console.log('\n   Ou forneça os IDs como argumentos:');
      console.log('   npx medusa exec ./src/scripts/product-import/hydrate-ids.ts <input-csv> <output-csv> <sales-channel-id> <shipping-profile-id>');
      process.exit(1);
    }

    // Hidrata as linhas
    let hydratedCount = 0;
    const hydratedRows = rows.map(row => {
      const hydratedRow = { ...row };
      
      if (!row['Product Sales Channel 1'] || row['Product Sales Channel 1'].trim() === '') {
        hydratedRow['Product Sales Channel 1'] = finalSalesChannelId;
        hydratedCount++;
      }
      
      if (!row['Shipping Profile Id'] || row['Shipping Profile Id'].trim() === '') {
        hydratedRow['Shipping Profile Id'] = finalShippingProfileId;
        hydratedCount++;
      }
      
      return hydratedRow;
    });

    // Garante que as colunas existem no header
    const finalHeaders = [...headers];
    if (!finalHeaders.includes('Product Sales Channel 1')) {
      finalHeaders.push('Product Sales Channel 1');
    }
    if (!finalHeaders.includes('Shipping Profile Id')) {
      finalHeaders.push('Shipping Profile Id');
    }

    // Salva arquivo hidratado
    writeCSV(outputFile, hydratedRows, finalHeaders);

    console.log(`\n✅ Arquivo hidratado salvo em: ${outputFile}`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Linhas processadas: ${hydratedRows.length}`);
    console.log(`   - IDs hidratados: ${hydratedCount} linhas`);
    console.log(`   - Sales Channel ID: ${finalSalesChannelId}`);
    console.log(`   - Shipping Profile ID: ${finalShippingProfileId}`);

  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
    process.exit(1);
  }
}
