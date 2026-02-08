import { migrator } from '../database/migrator'
import { db } from '../database/database'

async function migrate() {
  console.log('Running migrations...')
  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('failed to migrate')
    console.error(error)
    process.exit(1)
  }

  console.log('Migrations completed.')
  await db.destroy()
}

migrate()
