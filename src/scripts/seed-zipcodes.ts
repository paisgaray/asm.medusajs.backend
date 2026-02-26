import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { ulid } from "ulid"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedZipcodes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Starting region_zipcode seed...")

  // Busca a region criada pelo seed principal
  const existingRegions = await query.graph({
    entity: "region",
    fields: ["id", "name"],
    filters: { name: "Europe" },
  })

  if (!existingRegions?.data?.length) {
    throw new Error("Region 'Europe' not found. Run seed first (medusa_run_seed=true).")
  }

  const regionId = existingRegions.data[0].id

  // Idempotência: verifica se já foi populado
  // Acessa o banco via módulo de store (ou direto via pg connection)
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()
  const alreadySeeded = Boolean((store as any)?.metadata?.zipcodes_seeded)
  if (alreadySeeded) {
    logger.info("region_zipcode already seeded (store.metadata.zipcodes_seeded=true). Skipping.")
    return
  }

  // Carrega zip_codes.json
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const zipPath = path.join(__dirname, "zip_codes.json")
  const zipData: Record<string, string> = JSON.parse(fs.readFileSync(zipPath, "utf-8"))
  const zipCodes = Object.keys(zipData)

  logger.info(`Loaded ${zipCodes.length} zip codes. Inserting...`)

  // Insert via pg connection (acesso direto ao banco)
  const pgConnection = container.resolve("__pg_connection__")
  const now = new Date().toISOString()
  const BATCH = 500

  for (let i = 0; i < zipCodes.length; i += BATCH) {
    const batch = zipCodes.slice(i, i + BATCH)
    const values = batch
      .map((zip) => `('${ulid()}', '${zip.replace(/'/g, "''")}', '${regionId}', '${now}', '${now}', NULL)`)
      .join(", ")

    await pgConnection.query(`
      INSERT INTO region_zipcode (id, zipcode, region_id, created_at, updated_at, deleted_at)
      VALUES ${values}
    `)

    logger.info(`Inserted batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(zipCodes.length / BATCH)}`)
  }

  // Marca como concluído no store metadata
  const { updateStoresWorkflow } = await import("@medusajs/medusa/core-flows")
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        metadata: {
          ...(store as any).metadata,
          zipcodes_seeded: true,
          zipcodes_seeded_at: new Date().toISOString(),
          zipcodes_count: zipCodes.length,
        },
      },
    },
  })

  logger.info(`Done: ${zipCodes.length} zip codes inserted into region_zipcode.`)
}
