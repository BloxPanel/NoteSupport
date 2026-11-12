import { db } from './db'
import DOMPurify from 'dompurify'

import type { BackupData, DocumentViewMode, Note, Settings, Subject, ThemeMode } from '../types'
import { plainTextFromHtml } from '../lib/utils'

export const APP_VERSION = '0.1.0'

export const sampleSubjectColor = '#1d7cf2'

function makeId(prefix: string) {
  const stamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${stamp}_${random}`
}

export function normalizeClassDate(value: string | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export async function getSettings() {
  const existing = await db.settings.get('app-settings')
  return {
    id: 'app-settings' as const,
    theme: existing?.theme ?? 'system',
    documentView: existing?.documentView ?? 'document',
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  }
}

export async function saveSettings(changes: Partial<Pick<Settings, 'theme' | 'documentView'>>) {
  const current = await getSettings()
  const settings: Settings = {
    ...current,
    ...changes,
    id: 'app-settings',
    updatedAt: new Date().toISOString(),
  }
  await db.settings.put(settings)
  return settings
}

export async function saveThemePreference(theme: ThemeMode) {
  return saveSettings({ theme })
}

export async function saveDocumentViewPreference(documentView: DocumentViewMode) {
  return saveSettings({ documentView })
}

export async function createSubject(input: { name: string; color?: string }) {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Subject name is required.')
  }

  const subject: Subject = {
    id: makeId('subject'),
    name,
    color: input.color ?? sampleSubjectColor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await db.subjects.put(subject)
  return subject
}

export async function updateSubject(subjectId: string, changes: Partial<Pick<Subject, 'name' | 'color'>>) {
  const current = await db.subjects.get(subjectId)
  if (!current) throw new Error('Subject not found.')

  const updated: Subject = {
    ...current,
    ...changes,
    name: (changes.name ?? current.name).trim(),
    updatedAt: new Date().toISOString(),
  }

  await db.subjects.put(updated)
  return updated
}

export async function deleteSubject(subjectId: string) {
  await db.transaction('rw', db.subjects, db.notes, async () => {
    await db.notes.where('subjectId').equals(subjectId).modify((note) => {
      note.subjectId = null
      note.updatedAt = new Date().toISOString()
    })
    await db.subjects.delete(subjectId)
  })
}

export async function listSubjects() {
  return db.subjects.orderBy('name').toArray()
}

export async function listAllNotes() {
  return db.notes.orderBy('updatedAt').reverse().toArray()
}

export async function getNoteById(noteId: string) {
  return db.notes.get(noteId)
}

export async function createNote(input: Partial<Note> = {}) {
  const now = new Date().toISOString()
  const note: Note = {
    id: makeId('note'),
    title: (input.title ?? 'Untitled Note').trim() || 'Untitled Note',
    subjectId: input.subjectId ?? null,
    topic: input.topic ?? '',
    classDate: normalizeClassDate(input.classDate),
    contentHtml: input.contentHtml ?? '<p>Start taking notes...</p>',
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    lastAccessedAt: input.lastAccessedAt ?? now,
  }

  await db.notes.put(note)
  return note
}

export async function updateNote(noteId: string, changes: Partial<Note>) {
  const current = await db.notes.get(noteId)
  if (!current) throw new Error('Note not found.')

  const updated: Note = {
    ...current,
    ...changes,
    title: (changes.title ?? current.title).trim() || 'Untitled Note',
    subjectId: changes.subjectId ?? current.subjectId,
    classDate: changes.classDate === undefined ? current.classDate : normalizeClassDate(changes.classDate),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  }

  await db.notes.put(updated)
  return updated
}

export async function duplicateNote(noteId: string) {
  const source = await db.notes.get(noteId)
  if (!source) throw new Error('Note not found.')

  const duplicate: Note = {
    ...source,
    id: makeId('note'),
    title: `${source.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  }

  await db.notes.put(duplicate)
  return duplicate
}

export async function deleteNote(noteId: string) {
  await db.notes.delete(noteId)
}

export async function getVisibleNotes(options: {
  search?: string
  subjectId?: string | null
  sort?: 'updated' | 'created' | 'classDate'
  direction?: 'asc' | 'desc'
} = {}) {
  const { search = '', subjectId, sort = 'updated', direction = 'desc' } = options

  const notes = await listAllNotes()
  const normalizedSearch = search.trim().toLowerCase()

  const filtered = notes.filter((note) => {
    const matchesSearch =
      !normalizedSearch ||
      [note.title, note.topic, plainTextFromHtml(note.contentHtml)].join(' ').toLowerCase().includes(normalizedSearch)

    const matchesSubject = subjectId ? note.subjectId === subjectId : true

    return matchesSearch && matchesSubject
  })

  filtered.sort((a, b) => {
    const order = sort === 'created' ? a.createdAt.localeCompare(b.createdAt) : sort === 'classDate' ? (a.classDate ?? '').localeCompare(b.classDate ?? '') : a.updatedAt.localeCompare(b.updatedAt)
    return direction === 'asc' ? order : -order
  })

  return filtered
}

export function validateBackupData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'Import file is not a valid JSON object.'

  const candidate = data as Record<string, unknown>
  if (candidate.backupSchemaVersion !== 1) return 'Unsupported backup schema version.'
  if (!Array.isArray(candidate.subjects)) return 'Subjects data is missing or invalid.'
  if (!Array.isArray(candidate.notes)) return 'Notes data is missing or invalid.'
  if (!candidate.metadata || typeof candidate.metadata !== 'object') return 'Backup metadata is missing.'
  for (const [label, items] of [
    ['subject', candidate.subjects],
    ['note', candidate.notes],
  ] as const) {
    const identifiers = items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => item.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    if (new Set(identifiers).size !== identifiers.length) {
      return `Backup contains duplicate ${label} identifiers.`
    }
  }

  return null
}

function sanitizeSubject(subject: unknown): Subject | null {
  if (!subject || typeof subject !== 'object') return null
  const candidate = subject as Record<string, unknown>
  const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : makeId('subject')
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : 'Untitled subject'
  const color = typeof candidate.color === 'string' && candidate.color.trim() ? candidate.color.trim() : sampleSubjectColor
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
  const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
  return { id, name, color, createdAt, updatedAt }
}

function sanitizeNote(note: unknown): Note | null {
  if (!note || typeof note !== 'object') return null
  const candidate = note as Record<string, unknown>
  const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : makeId('note')
  const title = typeof candidate.title === 'string' ? candidate.title : 'Untitled Note'
  const topic = typeof candidate.topic === 'string' ? candidate.topic : ''
  const classDate = typeof candidate.classDate === 'string' ? normalizeClassDate(candidate.classDate) : null
  const subjectId = typeof candidate.subjectId === 'string' ? candidate.subjectId : null
  const contentHtml =
    typeof candidate.contentHtml === 'string'
      ? sanitizeRichTextHtml(candidate.contentHtml)
      : '<p>Imported note</p>'
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
  const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
  const lastAccessedAt = typeof candidate.lastAccessedAt === 'string' ? candidate.lastAccessedAt : updatedAt

  return {
    id,
    title,
    subjectId,
    topic,
    classDate,
    contentHtml,
    createdAt,
    updatedAt,
    lastAccessedAt,
  }
}

const SAFE_RICH_TEXT_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'hr',
  'li',
  'mark',
  'ol',
  'p',
  's',
  'span',
  'strong',
  'u',
  'ul',
]

const SAFE_RICH_TEXT_ATTRIBUTES = ['href', 'rel', 'target', 'start', 'style', 'data-color']

function isSafeCssColor(value: string) {
  return /^(#[\da-f]{3,8}|rgba?\([\d.%\s,]+\)|hsla?\([\d.%\s,]+\)|[a-z]{3,20})$/i.test(value.trim())
}

export function sanitizeRichTextHtml(html: string) {
  const purified = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: SAFE_RICH_TEXT_TAGS,
    ALLOWED_ATTR: SAFE_RICH_TEXT_ATTRIBUTES,
  })
  const template = document.createElement('template')
  template.innerHTML = purified

  template.content.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const color = element.style.color
    const backgroundColor = element.style.backgroundColor
    const textAlign = element.style.textAlign
    element.removeAttribute('style')

    if (color && isSafeCssColor(color)) element.style.color = color
    if (backgroundColor && isSafeCssColor(backgroundColor)) {
      element.style.backgroundColor = backgroundColor
    }
    if (['left', 'center', 'right', 'justify', 'start', 'end'].includes(textAlign)) {
      element.style.textAlign = textAlign
    }

    if (
      element.hasAttribute('style') &&
      !element.style.color &&
      !element.style.backgroundColor &&
      !element.style.textAlign
    ) {
      element.removeAttribute('style')
    }
  })

  template.content.querySelectorAll<HTMLElement>('[data-color]').forEach((element) => {
    const dataColor = element.getAttribute('data-color')
    if (!dataColor || !isSafeCssColor(dataColor)) element.removeAttribute('data-color')
  })

  template.content.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('rel', 'noopener noreferrer')
    anchor.setAttribute('target', '_blank')
  })

  return template.innerHTML
}

export async function exportBackup(): Promise<string> {
  const [subjects, notes] = await Promise.all([listSubjects(), listAllNotes()])
  const payload: BackupData = {
    backupSchemaVersion: 1,
    exportedAt: new Date().toISOString(),
    metadata: {
      appName: 'NoteSupport',
      version: APP_VERSION,
      storageMode: 'IndexedDB / Dexie',
    },
    subjects,
    notes,
  }

  return JSON.stringify(payload, null, 2)
}

export async function importBackup(jsonText: string) {
  const parsed = JSON.parse(jsonText) as unknown
  const validationError = validateBackupData(parsed)
  if (validationError) {
    throw new Error(validationError)
  }

  const nextSubjects = (parsed as { subjects: unknown[] }).subjects
    .map((item) => sanitizeSubject(item))
    .filter((item): item is Subject => Boolean(item))

  const nextNotes = (parsed as { notes: unknown[] }).notes
    .map((item) => sanitizeNote(item))
    .filter((item): item is Note => Boolean(item))

  await db.transaction('rw', db.subjects, db.notes, async () => {
    await db.subjects.clear()
    await db.notes.clear()
    if (nextSubjects.length > 0) {
      await db.subjects.bulkAdd(nextSubjects)
    }
    if (nextNotes.length > 0) {
      await db.notes.bulkAdd(nextNotes)
    }
  })

  return {
    importedSubjects: nextSubjects.length,
    importedNotes: nextNotes.length,
  }
}

export async function ensureSampleData() {
  const [subjectCount, noteCount] = await Promise.all([db.subjects.count(), db.notes.count()])
  if (subjectCount > 0 || noteCount > 0) return

  const subject: Subject = {
    id: makeId('subject'),
    name: 'American Military History',
    color: '#0ea5e9',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const note: Note = {
    id: makeId('note'),
    title: 'World War II Study Guide',
    subjectId: subject.id,
    topic: 'Cold War',
    classDate: new Date().toISOString().slice(0, 10),
    contentHtml: `
      <h1>World War II Study Guide</h1>
      <p>Focus on major turning points and consequences for the postwar era.</p>
      <h2>Key ideas</h2>
      <ul>
        <li>Axis and Allied powers</li>
        <li>Major battles and strategic decisions</li>
        <li>Impact on civilian life</li>
      </ul>
      <ol>
        <li>Review the timeline of events.</li>
        <li>Compare primary sources.</li>
        <li>Summarize the long-term consequences.</li>
      </ol>
      <p><mark>Important:</mark> Focus on how the war reshaped global politics.</p>
    `,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  }

  await db.transaction('rw', db.subjects, db.notes, async () => {
    await db.subjects.put(subject)
    await db.notes.put(note)
  })
}
