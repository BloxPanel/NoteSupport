import Dexie, { type Table } from 'dexie'

import type { Note, Settings, Subject } from '../types'

export class NoteSupportDatabase extends Dexie {
  subjects!: Table<Subject, string>
  notes!: Table<Note, string>
  settings!: Table<Settings, string>

  constructor() {
    super('NoteSupportDB')
    this.version(1).stores({
      subjects: 'id, name, updatedAt',
      notes: 'id, subjectId, topic, classDate, updatedAt, createdAt',
      settings: 'id',
    })
  }
}

export let db = new NoteSupportDatabase()

export async function resetDatabase() {
  db.close()
  await db.delete()
  db = new NoteSupportDatabase()
  return db
}
