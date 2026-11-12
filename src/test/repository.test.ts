import { beforeEach, describe, expect, it } from 'vitest'

import { db, resetDatabase } from '../storage/db'
import {
  createNote,
  createSubject,
  deleteSubject,
  duplicateNote,
  exportBackup,
  getVisibleNotes,
  importBackup,
  getSettings,
  saveDocumentViewPreference,
  updateNote,
  validateBackupData,
} from '../storage/repository'

beforeEach(async () => {
  await resetDatabase()
  await db.open()
})

describe('NoteSupport repository', () => {
  it('creates and deletes subjects without removing notes', async () => {
    const subject = await createSubject({ name: 'Chemistry', color: '#22c55e' })
    const note = await createNote({ title: 'Lab summary', subjectId: subject.id, topic: 'Acids', contentHtml: '<p>Acids release H+</p>' })

    expect(subject.name).toBe('Chemistry')
    expect(note.subjectId).toBe(subject.id)

    await deleteSubject(subject.id)

    const storedNote = await db.notes.get(note.id)
    expect(storedNote?.subjectId).toBeNull()
    expect(await db.subjects.count()).toBe(0)
  })

  it('filters notes by search and subject', async () => {
    const subject = await createSubject({ name: 'Astronomy', color: '#f59e0b' })
    await createNote({ title: 'Moon phases', subjectId: subject.id, topic: 'Lunar study', contentHtml: '<p>Waxing and waning phases</p>' })
    await createNote({ title: 'Solar flare notes', subjectId: subject.id, topic: 'Space weather', contentHtml: '<p>Solar activity affects satellites</p>' })

    const matches = await getVisibleNotes({ search: 'phase', subjectId: subject.id })
    expect(matches).toHaveLength(1)
    expect(matches[0]?.title).toBe('Moon phases')
  })

  it('duplicates a note with a new id and preserves content', async () => {
    const subject = await createSubject({ name: 'History' })
    const original = await createNote({
      title: 'Revolution notes',
      subjectId: subject.id,
      topic: 'French Revolution',
      contentHtml: '<p><strong>Key idea</strong>: popular unrest.</p>',
    })

    const duplicate = await duplicateNote(original.id)

    expect(duplicate.id).not.toBe(original.id)
    expect(duplicate.title).toBe('Revolution notes (Copy)')
    expect(duplicate.contentHtml).toBe(original.contentHtml)
  })

  it('exports valid JSON and validates imported backup data', async () => {
    const subject = await createSubject({ name: 'Geometry' })
    await createNote({
      title: 'Triangles',
      subjectId: subject.id,
      topic: 'Angles',
      contentHtml: '<p><mark>Important</mark> interior angles total 180°.</p>',
    })

    const backup = await exportBackup()
    const parsed = JSON.parse(backup)
    expect(parsed.backupSchemaVersion).toBe(1)
    expect(parsed.notes).toHaveLength(1)
    expect(validateBackupData(parsed)).toBeNull()

    const result = await importBackup(backup)
    expect(result.importedNotes).toBe(1)
  })

  it('persists document view preference and keeps existing notes during settings migration', async () => {
    const note = await createNote({
      id: 'legacy-note-1',
      title: 'Legacy note',
      contentHtml: '<p><strong>Existing formatting</strong></p>',
    })

    expect(await getSettings()).toMatchObject({ theme: 'system', documentView: 'document' })
    await saveDocumentViewPreference('continuous')

    expect(await getSettings()).toMatchObject({ documentView: 'continuous' })
    expect(await db.notes.get(note.id)).toEqual(note)
  })

  it('imports nested formatting and strips unsafe markup while retaining supported colors', async () => {
    const backup = {
      backupSchemaVersion: 1,
      exportedAt: new Date().toISOString(),
      metadata: { appName: 'NoteSupport', version: '0.1.0', storageMode: 'IndexedDB / Dexie' },
      subjects: [],
      notes: [
        {
          id: 'formatted-note',
          title: 'Formatted note',
          subjectId: null,
          topic: '',
          classDate: null,
          contentHtml:
            '<ol><li><p>First</p><ol><li><p>Nested</p></li></ol></li></ol><p style="text-align: center"><span style="color: rgb(37, 99, 235)">Blue text</span> <mark data-color="#90caf9" style="background-color: rgb(144, 202, 249)">Blue</mark></p><script>alert(1)</script><a href="javascript:alert(1)">unsafe</a>',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        },
      ],
    }

    await importBackup(JSON.stringify(backup))
    const imported = await db.notes.get('formatted-note')

    expect(imported?.contentHtml).toContain('<ol>')
    expect(imported?.contentHtml).toContain('Nested')
    expect(imported?.contentHtml).toContain('background-color: rgb(144, 202, 249)')
    expect(imported?.contentHtml).toContain('text-align: center')
    expect(imported?.contentHtml).toContain('color: rgb(37, 99, 235)')
    expect(imported?.contentHtml).not.toContain('<script')
    expect(imported?.contentHtml).not.toContain('javascript:')

    await importBackup(await exportBackup())
    const restored = await db.notes.get('formatted-note')
    expect(restored?.contentHtml).toContain('data-color="#90caf9"')
    expect(restored?.contentHtml).toContain('text-align: center')
  })

  it('rejects duplicate identifiers before replacing local data', async () => {
    const existing = await createNote({ title: 'Keep me' })
    const duplicateBackup = {
      backupSchemaVersion: 1,
      exportedAt: new Date().toISOString(),
      metadata: {},
      subjects: [],
      notes: [{ id: 'duplicate' }, { id: 'duplicate' }],
    }

    await expect(importBackup(JSON.stringify(duplicateBackup))).rejects.toThrow('duplicate note identifiers')
    expect(await db.notes.get(existing.id)).toEqual(existing)
  })

  it('preserves long document content through edits and backup round trips', async () => {
    const longText = 'Detailed classroom content. '.repeat(1200)
    const note = await createNote({ title: 'Long document', contentHtml: `<p>${longText}</p>` })
    const edited = await updateNote(note.id, {
      contentHtml: `<h1>Long document</h1><p>${longText}</p><ul><li><p>Summary</p></li></ul>`,
    })

    await importBackup(await exportBackup())

    const restored = await db.notes.get(note.id)
    expect(restored?.contentHtml).toBe(edited.contentHtml)
    expect(restored?.contentHtml.length).toBeGreaterThan(30_000)
  })
})
