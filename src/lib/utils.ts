import type { Note } from '../types'

export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ')
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateForInput(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function plainTextFromHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getNoteSearchText(note: Note) {
  return [note.title, note.topic, plainTextFromHtml(note.contentHtml)].join(' ').toLowerCase()
}
