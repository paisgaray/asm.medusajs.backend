import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createRegionsWorkflow, updateStoresWorkflow } from '@medusajs/medusa/core-flows';

import { REGION_ZIPCODES_MODULE } from '../modules/region-zipcodes';
import type RegionZipcodesModuleService from '../modules/region-zipcodes/service';

/**
 * Países associados às regiões criadas por este seed de zipcodes.
 * Hoje fixo em Espanha (es). Para outro país ou lista (ex.: ['pt'], ['es', 'pt']), altere aqui.
 * Documentado para permitir que o cliente mude no futuro sem procurar no código.
 */
const COUNTRIES = ['es'] as const;

type ZipJson = Record<string, string>; // zipcode -> regionName

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export default async function seedZipcodes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const regionZipcodesService = container.resolve(REGION_ZIPCODES_MODULE) as RegionZipcodesModuleService;

  // Ajuste o path se o arquivo estiver em outro lugar (ex.: dist/scripts/zip_codes.json no container)
  const zipPath = path.resolve(process.cwd(), 'src', 'scripts', 'zip_codes.json');
  if (!fs.existsSync(zipPath)) {
    logger.warn(`zip_codes.json não encontrado em ${zipPath}. Nada a fazer.`);
    return;
  }

  const zipRaw = fs.readFileSync(zipPath, 'utf-8');
  const zipData: ZipJson = JSON.parse(zipRaw);
  const zipcodes = Object.keys(zipData).filter((z) => (zipData[z] ?? '').trim());
  if (!zipcodes.length) {
    logger.info('zip_codes.json vazio. Nada a fazer.');
    return;
  }

  const fileHash = sha1(zipRaw);
  const [store] = await storeModuleService.listStores();
  const meta = ((store as any)?.metadata ?? {}) as Record<string, any>;

  if (meta.zipcodes_seeded_hash === fileHash) {
    logger.info('Zipcodes já seedados para este arquivo (hash). Skipping.');
    return;
  }

  const regionNames = Array.from(
    new Set(Object.values(zipData).map((v) => (v ?? '').trim()).filter(Boolean))
  );
  logger.info(`JSON carregado: ${zipcodes.length} zipcodes / ${regionNames.length} regiões.`);

  // 1) Garantir regiões: criar as que não existem, mapear name -> region_id
  const regionIdByName = new Map<string, string>();

  for (const name of regionNames) {
    const existing = await regionModuleService.listRegions({ name });
    if (existing.length) {
      const region = existing[0];
      regionIdByName.set(name, region.id);
      continue;
    }
    const { result: created } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name,
            currency_code: 'eur',
            countries: [...COUNTRIES],
            payment_providers: ['pp_system_default'],
          },
        ],
      },
    });
    if (created?.length) {
      regionIdByName.set(name, created[0].id);
    }
  }

  // 2) Listar todos os region_zipcode existentes (para upsert e sanitizar duplicatas)
  const existingZipcodes = await regionZipcodesService.listRegionZipcodes(
    {},
    { take: 100_000 }
  );
  const byZipcode = new Map<string, { id: string; region_id: string }[]>();
  for (const rz of existingZipcodes) {
    const list = byZipcode.get(rz.zipcode) ?? [];
    list.push({ id: rz.id, region_id: rz.region_id });
    byZipcode.set(rz.zipcode, list);
  }

  // 3) Sanear duplicatas: manter um por zipcode, deletar o resto
  for (const [, list] of byZipcode) {
    if (list.length <= 1) continue;
    const toDelete = list.slice(1);
    for (const item of toDelete) {
      await regionZipcodesService.deleteRegionZipcodes(item.id);
    }
  }

  // 4) Upsert em batch: criar faltantes, atualizar region_id dos existentes
  const BATCH = 500;
  let created = 0;
  let updated = 0;

  for (let i = 0; i < zipcodes.length; i += BATCH) {
    const batch = zipcodes.slice(i, i + BATCH);
    const toCreate: { zipcode: string; region_id: string }[] = [];
    const toUpdate: { id: string; region_id: string }[] = [];

    for (const zipcode of batch) {
      const regionName = (zipData[zipcode] ?? '').trim();
      const regionId = regionIdByName.get(regionName);
      if (!regionId) {
        logger.warn(`Região "${regionName}" não resolvida para zipcode ${zipcode}. Pulando.`);
        continue;
      }

      const list = byZipcode.get(zipcode);
      if (!list?.length) {
        toCreate.push({ zipcode, region_id: regionId });
      } else if (list[0].region_id !== regionId) {
        toUpdate.push({ id: list[0].id, region_id: regionId });
      }
    }

    if (toCreate.length) {
      // MedusaService pode aceitar um objeto ou array; criar em lote ou um a um
      try {
        await regionZipcodesService.createRegionZipcodes(toCreate as any);
      } catch {
        for (const item of toCreate) {
          await regionZipcodesService.createRegionZipcodes(item);
        }
      }
      created += toCreate.length;
      for (const item of toCreate) {
        byZipcode.set(item.zipcode, [{ id: '', region_id: item.region_id }]);
      }
    }
    for (const item of toUpdate) {
      await regionZipcodesService.updateRegionZipcodes({ id: item.id, region_id: item.region_id });
      updated += 1;
    }

    logger.info(
      `Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(zipcodes.length / BATCH)}: +${toCreate.length} criados, ${toUpdate.length} atualizados.`
    );
  }

  // 5) Marcar hash no store.metadata (idempotência)
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        metadata: {
          ...meta,
          zipcodes_seeded_hash: fileHash,
          zipcodes_seeded_at: new Date().toISOString(),
          zipcodes_count: zipcodes.length,
          zipcodes_regions_count: regionNames.length,
        },
      },
    },
  });

  logger.info(
    `Zipcode seed concluído. Criados: ${created}, atualizados: ${updated}, total zipcodes: ${zipcodes.length}.`
  );
}
