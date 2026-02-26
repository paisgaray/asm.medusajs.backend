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
  const pg = container.resolve("__pg_connection__") // Knex

  // Caminho do JSON (ajuste se seu arquivo estiver em outro lugar)
  const zipPath = path.resolve(process.cwd(), "src", "scripts", "zip_codes.json")
  const zipRaw = fs.readFileSync(zipPath, "utf-8")
  const zipData: ZipJson = JSON.parse(zipRaw)

  const zipcodes = Object.keys(zipData)
  if (!zipcodes.length) {
    logger.info("zip_codes.json vazio. Nada a fazer.")
    return
  }

  // Idempotência "à prova de retry": hash do arquivo salvo no store.metadata
  const fileHash = sha1(zipRaw)

  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()
  const meta = ((store as any)?.metadata ?? {}) as Record<string, any>

  if (meta.zipcodes_seeded_hash === fileHash) {
    logger.info("Zipcodes já seedados para este arquivo (hash). Skipping.")
    return
  }

  const nowIso = new Date().toISOString()

  // Importante em ECS/Terraform: lock global no Postgres para evitar concorrência
  // (lock fica preso na conexão até liberar; por isso usamos try/finally)
  const lockKey = 918273645 // número fixo do seu projeto (pode ser qualquer int)
  logger.info("Acquiring DB advisory lock for zipcode seed...")
  await pg.raw("SELECT pg_advisory_lock(?)", [lockKey])

  try {
    await pg.transaction(async (trx: any) => {
      // 1) Monta lista de regiões a partir do JSON
      const regionNames = Array.from(
        new Set(Object.values(zipData).map((v) => (v ?? "").trim()).filter(Boolean))
      )

      logger.info(`JSON carregado: ${zipcodes.length} zipcodes / ${regionNames.length} regions.`)

      // 2) Garante regions (cria/reativa) e resolve region_id por name
      // Sem depender de unique constraint: resolve "na mão" e saneia duplicatas
      const regionIdByName = new Map<string, string>()

      for (const name of regionNames) {
        // pega todos com esse name
        const rows = await trx("region")
          .select(["id", "deleted_at", "created_at"])
          .where({ name })
          .orderByRaw("deleted_at IS NULL DESC, created_at ASC")

        if (!rows.length) {
          // cria region com defaults alinhados ao seu schema
          const newId = `reg_${ulid()}`
          await trx("region").insert({
            id: newId,
            name,
            currency_code: "brl", // <-- ajuste se precisar
            metadata: null,
            created_at: nowIso,
            updated_at: nowIso,
            deleted_at: null,
            automatic_taxes: false,
          })
          regionIdByName.set(name, newId)
          continue
        }

        // se existe, escolhe uma "principal" (preferir ativa)
        const primary = rows[0]
        regionIdByName.set(name, primary.id)

        // reativa a principal se estiver deletada
        if (primary.deleted_at != null) {
          await trx("region").where({ id: primary.id }).update({
            deleted_at: null,
            updated_at: nowIso,
          })
        }

        // se tiver duplicatas, mantém só a principal ativa (as outras soft delete)
        if (rows.length > 1) {
          const dupIds = rows.slice(1).map((r: any) => r.id)
          await trx("region").whereIn("id", dupIds).update({
            deleted_at: nowIso,
            updated_at: nowIso,
          })
        }
      }

      // 3) SANEAR duplicatas de region_zipcode (mantém 1 ativo por zipcode)
      // Faz soft delete nas duplicadas (se existirem)
      // Mantém o menor created_at como “principal”
      logger.info("Sanitizing duplicates in region_zipcode (keeping 1 active per zipcode)...")
      await trx.raw(`
        WITH ranked AS (
          SELECT
            id,
            zipcode,
            ROW_NUMBER() OVER (PARTITION BY zipcode ORDER BY created_at ASC) AS rn
          FROM region_zipcode
          WHERE deleted_at IS NULL
        )
        UPDATE region_zipcode rz
        SET deleted_at = ?, updated_at = ?
        FROM ranked r
        WHERE rz.id = r.id
          AND r.rn > 1
      `, [nowIso, nowIso])

      // 4) Upsert “sem erro” por batch: UPDATE existentes + INSERT faltantes
      const BATCH = 1000
      logger.info("Upserting region_zipcode in batches...")

      for (let i = 0; i < zipcodes.length; i += BATCH) {
        const batch = zipcodes.slice(i, i + BATCH)

        // mapeia zipcode -> region_id (com validação)
        const batchMap = batch.map((zipcode) => {
          const regionName = (zipData[zipcode] ?? "").trim()
          const regionId = regionIdByName.get(regionName)
          if (!regionId) {
            throw new Error(`Region "${regionName}" não resolvida para zipcode ${zipcode}`)
          }
          return { zipcode, regionId }
        })

        const batchZipcodes = batchMap.map((x) => x.zipcode)

        // 4.1) UPDATE os que já existem (inclui os soft-deleted -> reativa)
        // Faz update individual via CASE (set-based) para evitar N updates
        // (em batches de 1000 fica ok)
        const cases = batchMap
          .map((x) => `WHEN '${x.zipcode.replace(/'/g, "''")}' THEN '${x.regionId.replace(/'/g, "''")}'`)
          .join(" ")

        await trx.raw(`
          UPDATE region_zipcode
          SET
            region_id = CASE zipcode ${cases} ELSE region_id END,
            updated_at = ?,
            deleted_at = NULL
          WHERE zipcode IN (${batchZipcodes.map(() => "?").join(",")})
        `, [nowIso, ...batchZipcodes])

        // 4.2) Descobre quais faltam e insere
        const existing = await trx("region_zipcode")
          .select(["zipcode"])
          .whereIn("zipcode", batchZipcodes)

        const existingSet = new Set(existing.map((r: any) => r.zipcode))
        const toInsert = batchMap.filter((x) => !existingSet.has(x.zipcode))

        if (toInsert.length) {
          const insertRows = toInsert.map((x) => ({
            id: ulid(),
            zipcode: x.zipcode,
            region_id: x.regionId,
            created_at: nowIso,
            updated_at: nowIso,
            deleted_at: null,
          }))
          await trx("region_zipcode").insert(insertRows)
        }

        logger.info(`Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(zipcodes.length / BATCH)} ok`)
      }

      // 5) Marca hash no store.metadata (idempotência por conteúdo)
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

      logger.info("Zipcode seed transaction committed.")
    })
  } finally {
    // garante liberar lock mesmo se der exception
    await pg.raw("SELECT pg_advisory_unlock(?)", [lockKey])
    logger.info("DB advisory lock released.")
  }
}
