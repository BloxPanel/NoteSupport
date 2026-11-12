import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileDown,
  FileUp,
  FolderTree,
  Hash,
  Highlighter,
  Italic,
  LayoutDashboard,
  Link as LinkIcon,
  List,
  ListOrdered,
  Menu,
  MoonStar,
  Paintbrush,
  PencilLine,
  Pilcrow,
  Plus,
  Printer,
  Redo2,
  Save,
  Search,
  Settings,
  SunMedium,
  Strikethrough,
  Trash2,
  Undo2,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Color from '@tiptap/extension-color'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import {
  HashRouter,
  Link as RouterLink,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { cn, formatDateForInput, formatShortDate, plainTextFromHtml } from './lib/utils'
import {
  createNote,
  createSubject,
  deleteNote,
  deleteSubject,
  duplicateNote,
  ensureSampleData,
  exportBackup,
  getNoteById,
  getSettings,
  getVisibleNotes,
  importBackup,
  listAllNotes,
  listSubjects,
  saveThemePreference,
  saveDocumentViewPreference,
  updateNote,
  updateSubject,
} from './storage/repository'
import type { DocumentViewMode, Note, Subject, ThemeMode } from './types'

const APP_NAME = 'NoteSupport'

function App() {
  const [theme, setTheme] = useState<ThemeMode>('system')

  useEffect(() => {
    void ensureSampleData()
    void getSettings().then((settings) => {
      setTheme(settings.theme)
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const isDark =
      theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', isDark)
    void saveThemePreference(theme)
  }, [theme])

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/:noteId" element={<NoteEditorPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/:subjectId" element={<SubjectNotesPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}

function AppLayout() {
  const navigate = useNavigate()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])

  const loadSubjects = useCallback(async () => {
    const nextSubjects = await listSubjects()
    setSubjects(nextSubjects)
  }, [])

  useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  const handleCreateNote = async () => {
    const note = await createNote({
      title: 'Untitled Note',
      contentHtml: '<p>Start taking notes...</p>',
    })
    navigate(`/notes/${note.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/90 p-5 shadow-soft backdrop-blur-lg transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900/90 lg:static lg:translate-x-0',
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">
                N
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">BuiltByBuzz</p>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">NoteSupport</h1>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            <button
              type="button"
              onClick={handleCreateNote}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-600"
            >
              <Plus size={18} />
              Create Note
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            <SidebarLink to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />
            <SidebarLink to="/notes" label="All Notes" icon={<BookOpenText size={18} />} />
            <SidebarLink to="/subjects" label="Subjects" icon={<FolderTree size={18} />} />
            <SidebarLink to="/timeline" label="Timeline" icon={<CalendarDays size={18} />} />
            <SidebarLink to="/settings" label="Settings" icon={<Settings size={18} />} />
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Subjects</p>
              <RouterLink to="/subjects" className="text-xs font-medium text-brand-600 dark:text-brand-400">
                Manage
              </RouterLink>
            </div>
            <div className="space-y-2">
              {subjects.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No subjects yet.</p>
              ) : (
                subjects.slice(0, 6).map((subject) => (
                  <RouterLink
                    key={subject.id}
                    to={`/subjects/${subject.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.name}
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </RouterLink>
                ))
              )}
            </div>
          </div>
        </aside>

        {isMobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />
        ) : null}

        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen((current) => !current)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  aria-label="Toggle menu"
                >
                  <Menu size={18} />
                </button>
              </div>
              <div className="hidden lg:block" />
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-8">
            <Outlet context={{ subjects, refreshSubjects: loadSubjects }} />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('system')

  useEffect(() => {
    void getSettings().then((settings) => setTheme(settings.theme))
  }, [])

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value)
    const root = document.documentElement
    const darkMode = value === 'dark' || (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', darkMode)
    void saveThemePreference(value)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
      {(['light', 'dark', 'system'] as ThemeMode[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleThemeChange(value)}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium capitalize transition',
            theme === value ? 'bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300',
          )}
        >
          {value === 'light' ? <SunMedium size={14} /> : value === 'dark' ? <MoonStar size={14} /> : <Hash size={14} />}
          {value}
        </button>
      ))}
    </div>
  )
}

function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleCreateNote = useCallback(async () => {
    const note = await createNote({
      title: 'Untitled Note',
      contentHtml: '<p>Start taking notes...</p>',
    })
    navigate(`/notes/${note.id}`)
  }, [navigate])

  const loadData = useCallback(async () => {
    const [nextNotes, nextSubjects] = await Promise.all([listAllNotes(), listSubjects()])
    setNotes(nextNotes)
    setSubjects(nextSubjects)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        const searchText = `${note.title} ${note.topic} ${plainTextFromHtml(note.contentHtml)}`.toLowerCase()
        return !search || searchText.includes(search.toLowerCase())
      }),
    [notes, search],
  )

  const headlineNotes = filteredNotes.slice(0, 4)
  const recentSubjects = subjects.slice(0, 4)

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Your notes dashboard</h2>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes, topics, and content"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none ring-0 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total notes" value={String(notes.length)} />
        <MetricCard label="Subjects" value={String(subjects.length)} />
        <MetricCard label="Recently edited" value={String(headlineNotes.length)} />
        <MetricCard label="Storage mode" value="Local" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recently edited notes</h3>
            <RouterLink to="/notes" className="text-sm font-medium text-brand-600 dark:text-brand-300">
              View all
            </RouterLink>
          </div>

          {headlineNotes.length === 0 ? (
            <EmptyState label="No notes yet" description="Create your first note to begin building a study archive." />
          ) : (
            <div className="space-y-3">
              {headlineNotes.map((note) => (
                <RouterLink
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">{note.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{note.topic || 'General topic'}</p>
                    </div>
                    <Clock3 size={15} className="mt-1 text-slate-400" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{note.subjectId ? 'Subject linked' : 'Unassigned'}</span>
                    <span>•</span>
                    <span>{formatShortDate(note.classDate)}</span>
                    <span>•</span>
                    <span>{formatShortDate(note.updatedAt)}</span>
                  </div>
                </RouterLink>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold">Subject cards</h3>
          <div className="space-y-3">
            {recentSubjects.length === 0 ? (
              <EmptyState label="No subjects" description="Create a new subject to organize classes." />
            ) : (
              recentSubjects.map((subject) => (
                <RouterLink
                  key={subject.id}
                  to={`/subjects/${subject.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: subject.color }} />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{subject.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {notes.filter((note) => note.subjectId === subject.id).length} notes
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400" />
                </RouterLink>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quick actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="New note" onClick={() => void handleCreateNote()} />
          <ActionButton label="Open notes" to="/notes" />
          <ActionButton label="Manage subjects" to="/subjects" />
        </div>
      </section>
    </div>
  )
}

function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'updated' | 'created' | 'classDate'>('updated')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')

  const loadData = useCallback(async () => {
    const [nextNotes, nextSubjects] = await Promise.all([getVisibleNotes({ subjectId: selectedSubject === 'all' ? undefined : selectedSubject, search, sort: sortKey, direction }), listSubjects()])
    setNotes(nextNotes)
    setSubjects(nextSubjects)
  }, [direction, search, selectedSubject, sortKey])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Search notes</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find notes by title, topic, or text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Subject</label>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="all">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Sort</label>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as 'updated' | 'created' | 'classDate')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="updated">Modified</option>
                <option value="created">Created</option>
                <option value="classDate">Class date</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Direction</label>
              <select
                value={direction}
                onChange={(event) => setDirection(event.target.value as 'asc' | 'desc')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="desc">Newest</option>
                <option value="asc">Oldest</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState label="No notes found" description="Adjust the filters or create a new note to get started." />
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={async () => { await deleteNote(note.id); void loadData() }} />
          ))
        )}
      </div>
    </div>
  )
}

function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#1d7cf2')

  const loadData = useCallback(async () => {
    const [nextSubjects, nextNotes] = await Promise.all([listSubjects(), listAllNotes()])
    setSubjects(nextSubjects)
    setNotes(nextNotes)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleAddSubject = async () => {
    await createSubject({ name, color })
    setName('')
    setColor('#1d7cf2')
    await loadData()
  }

  const handleRename = async (subjectId: string, currentName: string) => {
    const nextName = window.prompt('Rename subject', currentName)
    if (!nextName) return
    await updateSubject(subjectId, { name: nextName.trim() })
    await loadData()
  }

  const handleDelete = async (subjectId: string) => {
    if (!window.confirm('Delete this subject? Notes will remain and become unassigned.')) return
    await deleteSubject(subjectId)
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold">Manage subjects</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New subject name"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-12 w-16 rounded-xl border border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            onClick={() => void handleAddSubject()}
            className="rounded-xl bg-brand-500 px-4 py-2.5 font-medium text-white transition hover:bg-brand-600"
          >
            Add subject
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <div key={subject.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: subject.color }} />
                <p className="text-lg font-semibold">{subject.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void handleRename(subject.id, subject.name)} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200">
                  <PencilLine size={14} />
                </button>
                <button type="button" onClick={() => void handleDelete(subject.id)} className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {notes.filter((note) => note.subjectId === subject.id).length} notes in this subject
            </p>
            <RouterLink to={`/subjects/${subject.id}`} className="mt-4 inline-flex items-center text-sm font-medium text-brand-600 dark:text-brand-300">
              View notes <ChevronRight size={14} className="ml-1" />
            </RouterLink>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubjectNotesPage() {
  const { subjectId } = useParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  const loadData = useCallback(async () => {
    if (!subjectId) return
    const [nextSubject, allNotes] = await Promise.all([listSubjects().then((subjects) => subjects.find((entry) => entry.id === subjectId) ?? null), listAllNotes()])
    setSubject(nextSubject)
    setNotes(allNotes.filter((note) => note.subjectId === subjectId))
  }, [subjectId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (!subject) {
    return <EmptyState label="Subject not found" description="This subject may have been removed." />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: subject.color }} />
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Subject</p>
          <h2 className="text-2xl font-bold">{subject.name}</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState label="No notes yet" description="This subject does not have notes assigned to it." />
          </div>
        ) : (
          notes.map((note) => <NoteCard key={note.id} note={note} />)
        )}
      </div>
    </div>
  )
}

function TimelinePage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filterSubject, setFilterSubject] = useState('all')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')

  const loadData = useCallback(async () => {
    const [nextNotes, nextSubjects] = await Promise.all([listAllNotes(), listSubjects()])
    setNotes(nextNotes)
    setSubjects(nextSubjects)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const visible = notes.filter((note) => (filterSubject === 'all' ? true : note.subjectId === filterSubject)).sort((a, b) => {
    const first = (a.classDate ?? '9999-12-31').localeCompare(b.classDate ?? '9999-12-31')
    return direction === 'asc' ? first : -first
  })

  const groups = visible.reduce<Record<string, Note[]>>((acc, note) => {
    const key = note.classDate || 'Undated'
    acc[key] = acc[key] ? [...acc[key], note] : [note]
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Timeline</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Organized by class date.</p>
          </div>
          <div className="flex gap-3">
            <select
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="all">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <select
              value={direction}
              onChange={(event) => setDirection(event.target.value as 'asc' | 'desc')}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="asc">Chronological</option>
              <option value="desc">Reverse</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(groups).map(([key, groupedNotes]) => (
          <div key={key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-semibold">{key === 'Undated' ? 'Undated' : formatShortDate(key)}</h3>
            <div className="space-y-3">
              {groupedNotes.map((note) => (
                <RouterLink key={note.id} to={`/notes/${note.id}`} className="block rounded-2xl border border-slate-200 p-3 transition hover:border-brand-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{note.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{note.topic || 'No topic'}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {note.classDate ? 'Class date' : 'Undated'}
                    </span>
                  </div>
                </RouterLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsPage() {
  const [theme, setTheme] = useState<ThemeMode>('system')
  const [documentView, setDocumentView] = useState<DocumentViewMode>('document')
  const [storageInfo, setStorageInfo] = useState('IndexedDB / Dexie')
  const [notesCount, setNotesCount] = useState(0)

  useEffect(() => {
    void getSettings().then((settings) => {
      setTheme(settings.theme)
      setDocumentView(settings.documentView)
    })
    void listAllNotes().then((notes) => setNotesCount(notes.length))
  }, [])

  const handleExport = async () => {
    const payload = await exportBackup()
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `notesupport-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5_000_000) {
      window.alert('Backup is too large to import. Please use a file smaller than 5 MB.')
      return
    }

    const text = await file.text()
    try {
      const parsed = JSON.parse(text)
      if (parsed.backupSchemaVersion !== 1) {
        throw new Error('Unsupported backup schema version.')
      }
      const confirmed = window.confirm('Importing a backup will replace the current local data. Continue?')
      if (!confirmed) return
      await importBackup(text)
      setStorageInfo('IndexedDB / Dexie')
      window.alert('Backup imported successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The selected file could not be imported.'
      window.alert(message)
    }

    event.target.value = ''
  }

  const handleDeleteAll = async () => {
    const confirmed = window.confirm('Delete all local notes and subjects? This action cannot be undone.')
    if (!confirmed) return

    const [allNotes, allSubjects] = await Promise.all([listAllNotes(), listSubjects()])
    await Promise.all(allNotes.map((note) => deleteNote(note.id)))
    await Promise.all(allSubjects.map((subject) => deleteSubject(subject.id)))
    setNotesCount(0)
    window.alert('All local notes were deleted.')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold">Settings</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Appearance</p>
            <select
              value={theme}
              onChange={(event) => {
                const nextTheme = event.target.value as ThemeMode
                setTheme(nextTheme)
                const root = document.documentElement
                const darkMode = nextTheme === 'dark' || (nextTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
                root.classList.toggle('dark', darkMode)
                void saveThemePreference(nextTheme)
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="light">Light mode</option>
              <option value="dark">Dark mode</option>
              <option value="system">System theme</option>
            </select>
            <label htmlFor="document-view-preference" className="mb-2 mt-4 block text-sm font-medium text-slate-600 dark:text-slate-300">Editor view</label>
            <select
              id="document-view-preference"
              value={documentView}
              onChange={(event) => {
                const nextView = event.target.value as DocumentViewMode
                setDocumentView(nextView)
                void saveDocumentViewPreference(nextView)
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="document">Document View</option>
              <option value="continuous">Continuous View</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Storage</p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
              Local mode active
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Notes are stored in the browser. They are not synchronized between devices, and clearing browser data may delete local notes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold">Data management</h3>
          <div className="space-y-3">
            <button type="button" onClick={() => void handleExport()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
              <FileDown size={16} /> Export backup
            </button>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
              <FileUp size={16} /> Import backup
              <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
            </label>
            <button type="button" onClick={() => void handleDeleteAll()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
              <Trash2 size={16} /> Delete all local notes
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold">Application info</h3>
          <dl className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between gap-3"><dt>Version</dt><dd>{APP_NAME} 0.1.0</dd></div>
            <div className="flex justify-between gap-3"><dt>BuiltByBuzz</dt><dd>Public GitHub repo</dd></div>
            <div className="flex justify-between gap-3"><dt>Storage mode</dt><dd>{storageInfo}</dd></div>
            <div className="flex justify-between gap-3"><dt>Local notes</dt><dd>{notesCount}</dd></div>
            <div className="flex justify-between gap-3"><dt>Future sync</dt><dd>Cloudflare Worker + D1 planned</dd></div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">The route you requested does not exist.</p>
        <RouterLink to="/" className="mt-5 inline-flex rounded-xl bg-brand-500 px-4 py-2 text-white">
          Return to dashboard
        </RouterLink>
      </div>
    </div>
  )
}

function NoteEditorPage() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([])
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topic, setTopic] = useState('')
  const [classDate, setClassDate] = useState('')
  const [contentHtml, setContentHtml] = useState('<p>Start writing...</p>')
  const [saveState, setSaveState] = useState<'unsaved' | 'saving' | 'saved' | 'error'>('saved')
  const [documentView, setDocumentView] = useState<DocumentViewMode>('document')

  const loadData = useCallback(async () => {
    const [subjects, noteDetails, settings] = await Promise.all([
      listSubjects(),
      noteId && noteId !== 'new' ? getNoteById(noteId) : null,
      getSettings(),
    ])
    setSubjectOptions(subjects)
    setDocumentView(settings.documentView)

    if (noteId === 'new') {
      const created = await createNote({ title: 'Untitled Note', contentHtml: '<p>Start taking notes...</p>' })
      setNote(created)
      setTitle(created.title)
      setSubjectId(created.subjectId ?? '')
      setTopic(created.topic)
      setClassDate(created.classDate ?? '')
      setContentHtml(created.contentHtml)
      navigate(`/notes/${created.id}`, { replace: true })
      return
    }

    if (!noteDetails) {
      navigate('/notes', { replace: true })
      return
    }

    setNote(noteDetails)
    setTitle(noteDetails.title)
    setSubjectId(noteDetails.subjectId ?? '')
    setTopic(noteDetails.topic)
    setClassDate(noteDetails.classDate ?? '')
    setContentHtml(noteDetails.contentHtml)
  }, [navigate, noteId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const saveCurrentNote = useCallback(
    async (nextValues?: Partial<Note>) => {
      if (!note) return
      setSaveState('saving')
      try {
        const updated = await updateNote(note.id, {
          title: nextValues?.title ?? title,
          subjectId: nextValues?.subjectId ?? (subjectId || null),
          topic: nextValues?.topic ?? topic,
          classDate: nextValues?.classDate ?? (classDate || null),
          contentHtml: nextValues?.contentHtml ?? contentHtml,
        })
        setNote(updated)
        setSaveState('saved')
      } catch (error) {
        setSaveState('error')
        window.alert(error instanceof Error ? error.message : 'Saving failed. Please try again.')
      }
    },
    [classDate, contentHtml, note, subjectId, title, topic],
  )

  useEffect(() => {
    if (!note) return
    const timer = window.setTimeout(() => {
      void saveCurrentNote()
    }, 700)

    setSaveState('unsaved')
    return () => window.clearTimeout(timer)
  }, [classDate, contentHtml, note, saveCurrentNote, subjectId, title, topic])

  const handleDelete = async () => {
    if (!note) return
    const confirmed = window.confirm('Delete this note?')
    if (!confirmed) return
    await deleteNote(note.id)
    navigate('/notes', { replace: true })
  }

  const handleDuplicate = async () => {
    if (!note) return
    const duplicate = await duplicateNote(note.id)
    navigate(`/notes/${duplicate.id}`)
  }

  const handleDocumentViewChange = (nextView: DocumentViewMode) => {
    setDocumentView(nextView)
    void saveDocumentViewPreference(nextView)
  }

  if (!note) {
    return <EmptyState label="Loading note" description="Preparing the editor..." />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-semibold outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void saveCurrentNote()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
              <Save size={15} /> {saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Retry save' : 'Save'}
            </button>
            <button type="button" onClick={() => void handleDuplicate()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
              <Copy size={15} /> Duplicate
            </button>
            <button type="button" onClick={() => void handleDelete()} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Subject</label>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Unassigned</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Topic</label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Class date</label>
            <input
              type="date"
              value={formatDateForInput(classDate)}
              onChange={(event) => setClassDate(event.target.value || '')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          {saveState === 'saved' ? <CheckCircle2 size={15} className="text-emerald-500" /> : saveState === 'error' ? <AlertTriangle size={15} className="text-rose-500" /> : <Clock3 size={15} className="text-amber-500" />}
          <span>
            {saveState === 'saved' ? 'Saved successfully' : saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save failed — retry available' : 'Unsaved changes'}
          </span>
        </div>
      </div>

      <RichTextEditor
        initialHtml={contentHtml}
        title={title}
        viewMode={documentView}
        onChange={setContentHtml}
        onViewModeChange={handleDocumentViewChange}
      />
    </div>
  )
}

export const ListIndentation = Extension.create({
  name: 'listIndentation',
  addKeyboardShortcuts() {
    return {
      Tab: () =>
        this.editor.isActive('listItem') ? this.editor.commands.sinkListItem('listItem') : false,
      'Shift-Tab': () =>
        this.editor.isActive('listItem') ? this.editor.commands.liftListItem('listItem') : false,
    }
  },
})

const highlightColors = [
  { label: 'Yellow highlight', value: '#fff176' },
  { label: 'Green highlight', value: '#a5d6a7' },
  { label: 'Blue highlight', value: '#90caf9' },
  { label: 'Pink highlight', value: '#f48fb1' },
  { label: 'Orange highlight', value: '#ffcc80' },
]

const textColors = [
  { label: 'Black text', value: '#111827' },
  { label: 'Red text', value: '#dc2626' },
  { label: 'Blue text', value: '#2563eb' },
  { label: 'Green text', value: '#15803d' },
  { label: 'Purple text', value: '#7e22ce' },
]

export function RichTextEditor({
  initialHtml,
  title,
  viewMode,
  onChange,
  onViewModeChange,
}: {
  initialHtml: string
  title: string
  viewMode: DocumentViewMode
  onChange: (value: string) => void
  onViewModeChange: (value: DocumentViewMode) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ListIndentation,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'min-h-[760px] prose prose-slate max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== initialHtml) {
      editor.commands.setContent(initialHtml)
    }
  }, [editor, initialHtml])

  if (!editor) return null

  return (
    <div className="editor-shell overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="editor-toolbar sticky top-[58px] z-10 flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="mr-auto flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" aria-label="Document view">
            {(['document', 'continuous'] as DocumentViewMode[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={viewMode === value}
                title={`${value === 'document' ? 'Document' : 'Continuous'} view`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onViewModeChange(value)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium',
                  viewMode === value
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {value === 'document' ? 'Document' : 'Continuous'}
              </button>
            ))}
          </div>
          <ToolbarButton onClick={() => window.print()} icon={<Printer size={15} />} label="Print or save as PDF" />
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold size={15} />} label="Bold (Ctrl+B)" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic size={15} />} label="Italic (Ctrl+I)" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={<UnderlineIcon size={15} />} label="Underline (Ctrl+U)" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={<Strikethrough size={15} />} label="Strikethrough" />
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} icon={<Pilcrow size={15} />} label="Paragraph" />
          {[1, 2, 3].map((level) => (
            <ToolbarButton
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
              active={editor.isActive('heading', { level })}
              icon={<span className="text-[11px] font-bold">H{level}</span>}
              label={`Heading ${level}`}
            />
          ))}
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft size={15} />} label="Align left" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter size={15} />} label="Align center" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={<AlignRight size={15} />} label="Align right" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} icon={<AlignJustify size={15} />} label="Justify" />
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => {
              const href = window.prompt('Link URL', 'https://')
              if (href) editor.chain().focus().setLink({ href }).run()
            }}
            active={editor.isActive('link')}
            icon={<LinkIcon size={15} />}
            label="Add link"
          />
          <ColorMenu
            label="Highlight color"
            icon={<Highlighter size={15} />}
            colors={highlightColors}
            onSelect={(value) => editor.chain().focus().setHighlight({ color: value }).run()}
          />
          <ColorMenu
            label="Text color"
            icon={<Paintbrush size={15} />}
            colors={textColors}
            onSelect={(value) => editor.chain().focus().setColor(value).run()}
          />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List size={15} />} label="Bullet list" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={<ListOrdered size={15} />} label="Numbered list" />
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={<span className="text-sm font-bold">―</span>} label="Horizontal rule" />
          <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} icon={<span className="text-xs font-semibold">Tx</span>} label="Clear formatting" />
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={<Undo2 size={15} />} label="Undo (Ctrl+Z)" />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={<Redo2 size={15} />} label="Redo (Ctrl+Y)" />
        </div>
      </div>
      <div className={cn('editor-workspace overflow-x-auto px-3 py-6 sm:px-6', viewMode === 'document' ? 'document-view' : 'continuous-view')}>
        <div className="print-document">
          <h1 className="print-title">{title}</h1>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
}

function ColorMenu({
  label,
  icon,
  colors,
  onSelect,
}: {
  label: string
  icon: React.ReactNode
  colors: Array<{ label: string; value: string }>
  onSelect: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {icon}
        <span aria-hidden="true" className="text-[10px]">▾</span>
      </button>
      {isOpen ? <div className="absolute left-0 top-full z-30 min-w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            aria-label={color.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect(color.value)
              setIsOpen(false)
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: color.value }} />
            {color.label.replace(/ (highlight|text)$/i, '')}
          </button>
        ))}
      </div> : null}
    </div>
  )
}

function ToolbarButton({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
        active && 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300',
      )}
    >
      {icon}
    </button>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function EmptyState({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}

function ActionButton({ label, to, onClick }: { label: string; to?: string; onClick?: () => void }) {
  if (to) {
    return (
      <RouterLink to={to} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
        {label}
      </RouterLink>
    )
  }

  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600">
      {label}
    </button>
  )
}

function NoteCard({ note, onDelete }: { note: Note; onDelete?: () => void }) {
  const subjectColor = note.subjectId ? '#1d7cf2' : '#94a3b8'

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{note.title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{note.topic || 'General topic'}</p>
        </div>
        <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: `${subjectColor}18`, color: subjectColor }}>
          {note.subjectId ? 'Linked' : 'Unassigned'}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p className="flex items-center gap-2"><CalendarDays size={15} /> {formatShortDate(note.classDate)}</p>
        <p className="flex items-center gap-2"><Clock3 size={15} /> Last modified {formatShortDate(note.updatedAt)}</p>
      </div>

      <p className="mt-4 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{plainTextFromHtml(note.contentHtml) || 'No note content yet.'}</p>

      <div className="mt-5 flex items-center justify-between gap-2">
        <RouterLink to={`/notes/${note.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
          Open note
        </RouterLink>
        {onDelete ? (
          <button type="button" onClick={onDelete} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
            Delete
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default App
