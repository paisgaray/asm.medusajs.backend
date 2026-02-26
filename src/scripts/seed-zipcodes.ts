import fs from "fs"
import path from "path"
import crypto from "crypto"
import { ulid } from "ulid"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type ZipJson = Record<string, string> // zipcode -> regionName

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex")
}

export default async function seedZipcodes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()
  const meta = ((store as any)?.metadata ?? {}) as Record<string, any>

  logger.info("Starting seed: create regions (if needed) + region_zipcode from zip_codes.json...")

  // --- Load JSON (zipcode -> regionName)
  const zipPath = path.resolve(process.cwd(), "src", "scripts", "zip_codes.json")
  const zipRaw = fs.readFileSync(zipPath, "utf-8")
  const zipData: ZipJson = JSON.parse(zipRaw)

  const zipcodes = Object.keys(zipData)
  if (!zipcodes.length) {
    logger.info("zip_codes.json vazio. Nada a fazer.")
    return
  }

  const fileHash = sha1(zipRaw)
  if (meta.zipcodes_seeded_hash === fileHash) {
    logger.info("Seed já aplicado para este arquivo (hash). Skipping.")
    return
  }

  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) // Knex

  // --- Collect regions from JSON
  const regionNames = Array.from(
    new Set(Object.values(zipData).map((v) => (v ?? "").trim()).filter(Boolean))
  )

  logger.info(`JSON: ${zipcodes.length} zipcodes / ${regionNames.length} regions.`)

  // --- Ensure region exists (or revive if soft-deleted)
  // We’ll keep a map regionName -> regionId
  const regionIdByName = new Map<string, string>()

  // Busca existentes (inclui deletadas)
  const existingRegions = await pg("region")
    .select(["id", "name", "deleted_at"])
    .whereIn("name", regionNames)

  for (const r of existingRegions) {
    regionIdByName.set(r.name, r.id)
  }

  // Cria as que faltam (com defaults coerentes ao seu schema)
  // Ajuste currency_code/automatic_taxes conforme sua regra (usei eur/false como padrão).
  const missing = regionNames.filter((name) => !regionIdByName.has(name))

  if (missing.length) {
    logger.info(`Creating ${missing.length} missing regions...`)
    const now = new Date().toISOString()

    const rows = missing.map((name) => ({
      id: `reg_${ulid()}`,
      name,
      currency_code: "eur",
      metadata: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      automatic_taxes: false,
    }))

    await pg("region").insert(rows)

    // Recarrega IDs criados
    const createdRegions = await pg("region").select(["id", "name"]).whereIn("name", missing)
    for (const r of createdRegions) regionIdByName.set(r.name, r.id)
  }

  // Reativa (soft delete) se existir deletada
  // (importante pelo seu exemplo onde deleted_at está preenchido)
  const toRevive = existingRegions.filter((r: any) => r.deleted_at != null).map((r: any) => r.id)
  if (toRevive.length) {
    logger.info(`Reviving ${toRevive.length} soft-deleted regions...`)
    await pg("region").whereIn("id", toRevive).update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
  }

  // --- Insert region_zipcode
  // Preparar linhas (zipcode + region_id)
  const now = new Date().toISOString()
  const BATCH = 1000

  logger.info("Inserting into region_zipcode...")

  // Se existir unique index em (region_id, zipcode), habilite ON CONFLICT DO NOTHING:
  // CREATE UNIQUE INDEX IF NOT EXISTS ux_region_zipcode_region_zipcode ON region_zipcode(region_id, zipcode) WHERE deleted_at IS NULL;
  //
  // Como não dá pra assumir, eu faço insert via builder e, se estourar duplicidade,
  // você pode criar o índice acima e usar o bloco SQL com ON CONFLICT.

  for (let i = 0; i < zipcodes.length; i += BATCH) {
    const batch = zipcodes.slice(i, i + BATCH)

    const rows = batch.map((zipcode) => {
      const regionName = (zipData[zipcode] ?? "").trim()
      const regionId = regionIdByName.get(regionName)
      if (!regionId) {
        throw new Error(`Region "${regionName}" não encontrada/criada para zipcode ${zipcode}`)
      }

      return {
        id: ulid(),
        zipcode,
        region_id: regionId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }
    })

    await pg("region_zipcode")
      .insert(rows)
      .onConflict("zipcode")
      .merge(["region_id", "updated_at", "deleted_at"])

    logger.info(`Inserted batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(zipcodes.length / BATCH)}`)
  }

  // --- Mark done in store metadata (hash)
  const { updateStoresWorkflow } = await import("@medusajs/medusa/core-flows")
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
  })

  logger.info("Done seeding regions + region_zipcode.")
}
