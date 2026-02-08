import * as path from 'path'
import { promises as fs } from 'fs'
import { Migrator, FileMigrationProvider } from 'kysely'
import { db } from './database'

export const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    // Ensure this path works both in ts-node (src) and dist (build)
    // __dirname in src/database/migrator.ts points to src/database
    migrationFolder: path.join(__dirname, 'migrations')
  })
})
