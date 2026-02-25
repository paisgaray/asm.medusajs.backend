import { Migration } from "@mikro-orm/migrations"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { ulid } from "ulid"

export class SeedRegionZipcodes extends Migration {
  async up(): Promise<void> {
    // Carrega zip_codes.json do mesmo diretório de scripts
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const zipPath = path.join(__dirname, "../scripts/zip_codes.json")
    const zipData: Record<string, string> = JSON.parse(fs.readFileSync(zipPath, "utf-8"))
    const zipCodes = Object.keys(zipData)

    // Busca o ID da region criada pelo seed
    const rows = await this.execute(
      `SELECT id FROM region WHERE name = 'Europe' AND deleted_at IS NULL LIMIT 1`
    )
    if (!rows.length) {
      throw new Error("Region 'Europe' not found. Run seed (medusa_run_seed=true) before this migration.")
    }
    const regionId: string = rows[0].id

    // Verifica se já foi populada (idempotência)
    const existing = await this.execute(
      `SELECT COUNT(*) as count FROM region_zipcode WHERE region_id = '${regionId}'`
    )
    if (parseInt(existing[0].count, 10) > 0) {
      console.log(`region_zipcode already populated (${existing[0].count} rows). Skipping.`)
      return
    }

    const now = new Date().toISOString()
    const BATCH = 500

    console.log(`Inserting ${zipCodes.length} zip codes into region_zipcode...`)

    for (let i = 0; i < zipCodes.length; i += BATCH) {
      const batch = zipCodes.slice(i, i + BATCH)
      const values = batch
        .map((zip) => `('${ulid()}', '${zip.replace(/'/g, "''")}', '${regionId}', '${now}', '${now}', NULL)`)
        .join(",\n")

      await this.execute(`
        INSERT INTO region_zipcode (id, zipcode, region_id, created_at, updated_at, deleted_at)
        VALUES ${values}
      `)
    }

    console.log(`Done: ${zipCodes.length} zip codes inserted.`)
  }

  async down(): Promise<void> {
    await this.execute(`DELETE FROM region_zipcode WHERE TRUE`)
  }
}
