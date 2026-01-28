/**
 * Script para traduzir produtos para Catalão usando Translation Module do Medusa v2
 * 
 * Este script lê um arquivo CSV/JSON com traduções e aplica via API de tradução
 * 
 * Formato do arquivo de tradução (CSV):
 * Product Handle,Title CA,Description CA
 * kefir-de-oveja-eco,Títol en català,Descripció en català
 * 
 * Ou JSON:
 * [
 *   {
 *     "handle": "kefir-de-oveja-eco",
 *     "title_ca": "Títol en català",
 *     "description_ca": "Descripció en català"
 *   }
 * ]
 * 
 * Uso:
 * npx medusa exec ./src/scripts/product-import/translate-catalan.ts <translations-file> [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExecArgs } from '@medusajs/framework/types';

interface Translation {
  handle: string;
  title_ca: string;
  description_ca?: string;
  subtitle_ca?: string;
}

/**
 * Lê arquivo de traduções (CSV ou JSON)
 */
function readTranslations(filePath: string): Translation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content);
  }

  // CSV
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const translations: Translation[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const translation: Translation = {
      handle: values[0] || '',
      title_ca: values[1] || '',
      description_ca: values[2] || '',
      subtitle_ca: values[3] || '',
    };

    if (translation.handle && translation.title_ca) {
      translations.push(translation);
    }
  }

  return translations;
}

export default async function translateCatalan({
  container,
  args,
}: ExecArgs) {
  const translationsPath = args[0];
  const dryRun = args.includes('--dry-run');

  if (!translationsPath) {
    console.error('❌ Erro: Arquivo de traduções não fornecido');
    console.log('Uso: npx medusa exec ./src/scripts/product-import/translate-catalan.ts <translations-file> [--dry-run]');
    process.exit(1);
  }

  const translationsFile = path.resolve(process.cwd(), translationsPath);

  if (!fs.existsSync(translationsFile)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${translationsFile}`);
    process.exit(1);
  }

  console.log(`📖 Lendo traduções: ${translationsFile}`);
  if (dryRun) {
    console.log('🔍 Modo DRY-RUN: Nenhuma alteração será feita');
  }

  try {
    const translations = readTranslations(translationsFile);
    
    if (translations.length === 0) {
      console.warn('⚠️  Nenhuma tradução encontrada no arquivo');
      return;
    }

    console.log(`✅ Encontradas ${translations.length} traduções`);

    const productModule = container.resolve('product');
    const translationModule = container.resolve('translation');
    const logger = container.resolve('logger');

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ handle: string; error: string }> = [];

    for (const translation of translations) {
      try {
        // Busca produto pelo handle
        const products = await productModule.listProducts({
          handle: translation.handle,
        });

        if (!products || products.length === 0) {
          console.warn(`⚠️  Produto não encontrado: ${translation.handle}`);
          errorCount++;
          errors.push({ handle: translation.handle, error: 'Produto não encontrado' });
          continue;
        }

        const product = products[0];

        if (dryRun) {
          console.log(`[DRY-RUN] Traduziria: ${translation.handle}`);
          console.log(`   Título ES: ${product.title}`);
          console.log(`   Título CA: ${translation.title_ca}`);
          successCount++;
          continue;
        }

        // Cria/atualiza tradução usando Translation Module
        // Medusa v2 usa o módulo de tradução oficial
        try {
          // Tenta criar tradução via Translation Module
          // API pode variar dependendo da versão exata do Medusa v2
          const translationData = {
            resource_type: 'product',
            resource_id: product.id,
            locale: 'ca-ES',
            translations: {
              title: translation.title_ca,
              description: translation.description_ca || product.description || '',
              subtitle: translation.subtitle_ca || product.subtitle || '',
            },
          };

          // Tenta método createTranslations se disponível
          if (typeof translationModule.createTranslations === 'function') {
            await translationModule.createTranslations(translationData);
          } else if (typeof translationModule.create === 'function') {
            await translationModule.create(translationData);
          } else {
            // Fallback: usa metadata
            throw new Error('Translation Module API não disponível, usando metadata');
          }

          console.log(`✅ Traduzido: ${translation.handle}`);
          successCount++;
        } catch (translationError: any) {
          // Fallback: usa metadata se Translation Module não funcionar
          console.warn(`⚠️  Erro no Translation Module, tentando metadata: ${translationError.message}`);
          
          try {
            await productModule.updateProducts(product.id, {
              metadata: {
                ...(product.metadata || {}),
                title_ca: translation.title_ca,
                description_ca: translation.description_ca,
                subtitle_ca: translation.subtitle_ca,
              },
            });

            console.log(`✅ Traduzido (via metadata): ${translation.handle}`);
            successCount++;
          } catch (metadataError: any) {
            throw new Error(`Erro ao salvar tradução: ${metadataError.message}`);
          }
        }

      } catch (error: any) {
        console.error(`❌ Erro ao traduzir ${translation.handle}:`, error.message);
        errorCount++;
        errors.push({ handle: translation.handle, error: error.message });
      }
    }

    console.log(`\n📊 Estatísticas:`);
    console.log(`   - Traduções processadas: ${translations.length}`);
    console.log(`   - Sucesso: ${successCount}`);
    console.log(`   - Erros: ${errorCount}`);

    if (errors.length > 0) {
      console.log(`\n❌ Erros encontrados:`);
      errors.forEach(({ handle, error }) => {
        console.log(`   - ${handle}: ${error}`);
      });
    }

    if (!dryRun && successCount > 0) {
      console.log(`\n✅ Tradução concluída!`);
      console.log(`\n💡 Verifique os produtos no Admin para confirmar as traduções`);
    }

  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    process.exit(1);
  }
}
