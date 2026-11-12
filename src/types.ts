export type ThemeMode = 'light' | 'dark' | 'system'
export type DocumentViewMode = 'document' | 'continuous'

export type Subject = {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export type Note = {
  id: string
  title: string
  subjectId: string | null
  topic: string
  classDate: string | null
  contentHtml: string
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
}

export type Settings = {
  id: 'app-settings'
  theme: ThemeMode
  documentView: DocumentViewMode
  updatedAt: string
}

export type BackupData = {
  backupSchemaVersion: number
  exportedAt: string
  metadata: {
    appName: string
    version: string
    storageMode: string
  }
  subjects: Subject[]
  notes: Note[]
}
