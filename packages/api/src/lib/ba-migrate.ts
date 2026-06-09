import { getSchema } from 'better-auth/db'
import type { Pool } from 'pg'

// Core BA tables that are created by BA itself on first run.
// We never CREATE these — only ALTER to add plugin columns.
const BA_CORE_TABLES = new Set(['user', 'session', 'account', 'verification'])

type FieldType = 'string' | 'boolean' | 'date' | 'number'

function pgType(type: FieldType): string {
  switch (type) {
    case 'boolean': return 'BOOLEAN'
    case 'number':  return 'INTEGER'
    case 'date':    return 'TIMESTAMPTZ'
    default:        return 'TEXT'
  }
}

function defaultClause(field: { defaultValue?: unknown; type: FieldType }): string {
  if (field.defaultValue === undefined) return ''
  if (field.defaultValue === false || field.defaultValue === true) return ` DEFAULT ${field.defaultValue}`
  if (field.defaultValue === 0) return ' DEFAULT 0'
  if (typeof field.defaultValue === 'string') return ` DEFAULT '${field.defaultValue}'`
  return ''
}

// Runs idempotent migrations for tables/columns added by BA plugins (twoFactor, etc).
// Must be called after the pool is ready, before the server starts serving traffic.
export async function runBaPluginMigrations(
  config: Parameters<typeof getSchema>[0],
  pool: Pool,
): Promise<void> {
  const schema = getSchema(config)

  for (const [modelName, table] of Object.entries(schema)) {
    const fields = table.fields as Record<string, {
      type: FieldType
      required?: boolean
      unique?: boolean
      defaultValue?: unknown
      references?: { model: string; field: string }
      index?: boolean
    }>

    if (BA_CORE_TABLES.has(modelName)) {
      // Only add columns that the plugin adds to existing BA tables.
      // We identify these by running ALTER TABLE ADD COLUMN IF NOT EXISTS.
      for (const [colName, field] of Object.entries(fields)) {
        const notNull = field.required ? ' NOT NULL' : ''
        const def = defaultClause(field as { defaultValue?: unknown; type: FieldType })
        await pool.query(
          `ALTER TABLE "${modelName}" ADD COLUMN IF NOT EXISTS "${colName}" ${pgType(field.type)}${notNull}${def}`,
        ).catch(() => { /* column already exists — safe to ignore */ })
      }
      continue
    }

    // Plugin-owned table — create from scratch (idempotent).
    const colDefs: string[] = [`id TEXT PRIMARY KEY`]

    for (const [colName, field] of Object.entries(fields)) {
      const notNull = field.required ? ' NOT NULL' : ''
      const unique   = field.unique  ? ' UNIQUE'   : ''
      const def = defaultClause(field as { defaultValue?: unknown; type: FieldType })

      let refClause = ''
      if (field.references) {
        refClause = ` REFERENCES "${field.references.model}"("${field.references.field}") ON DELETE CASCADE`
      }

      colDefs.push(`"${colName}" ${pgType(field.type)}${notNull}${unique}${def}${refClause}`)
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS "${modelName}" (${colDefs.join(', ')})`,
    )

    // Secondary indexes
    for (const [colName, field] of Object.entries(fields)) {
      if (field.index) {
        await pool.query(
          `CREATE INDEX IF NOT EXISTS "${modelName}_${colName}_idx" ON "${modelName}"("${colName}")`,
        ).catch(() => {})
      }
    }
  }
}
