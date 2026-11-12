import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ListIndentation, RichTextEditor } from '../App'

afterEach(cleanup)

describe('document editor', () => {
  it('renders nested lists and available document formatting controls', () => {
    render(
      <RichTextEditor
        initialHtml="<h1>Study notes</h1><ol><li><p>First</p><ol><li><p>Nested</p></li></ol></li></ol>"
        title="Study notes"
        viewMode="document"
        onChange={vi.fn()}
        onViewModeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Nested')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strikethrough' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heading 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Align center' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Horizontal rule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeInTheDocument()
  })

  it('offers the supported highlight colors in the toolbar', () => {
    render(
      <RichTextEditor
        initialHtml="<p>Color this selected phrase.</p>"
        title="Color test"
        viewMode="document"
        onChange={vi.fn()}
        onViewModeChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Highlight color' }))
    expect(screen.getByRole('button', { name: 'Yellow highlight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Green highlight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Blue highlight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pink highlight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orange highlight' })).toBeInTheDocument()
  })

  it('applies a selected highlight and announces active formatting accessibly', () => {
    const formattingEditor = new Editor({
      extensions: [StarterKit, Highlight.configure({ multicolor: true })],
      content: '<p>Color this selected phrase.</p>',
    })
    formattingEditor.commands.setTextSelection({ from: 1, to: 29 })
    formattingEditor.chain().setHighlight({ color: '#fff176' }).run()
    expect(formattingEditor.getHTML()).toContain('data-color="#fff176"')
    formattingEditor.destroy()

    render(
      <RichTextEditor
        initialHtml="<p>Color this selected phrase.</p>"
        title="Color test"
        viewMode="document"
        onChange={vi.fn()}
        onViewModeChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Bold (Ctrl+B)' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('provides persisted document and continuous view toggle controls', () => {
    const onViewModeChange = vi.fn()
    render(
      <RichTextEditor
        initialHtml="<p>Document content</p>"
        title="Document"
        viewMode="document"
        onChange={vi.fn()}
        onViewModeChange={onViewModeChange}
      />,
    )

    const continuousButton = screen.getByRole('button', { name: 'Continuous' })
    fireEvent.click(continuousButton)
    expect(onViewModeChange).toHaveBeenCalledWith('continuous')
  })

  it('uses Tab and Shift+Tab to indent and outdent only within list items', () => {
    const editor = new Editor({
      extensions: [StarterKit, ListIndentation],
      content: '<ul><li><p>First</p></li><li><p>Second</p></li></ul>',
    })

    let secondTextPosition = 0
    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text === 'Second') secondTextPosition = position + 1
    })
    editor.commands.setTextSelection(secondTextPosition)
    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(editor.getHTML()).toContain('<ul><li><p>First</p><ul><li><p>Second</p></li></ul></li></ul>')

    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(editor.getHTML()).toContain('<ul><li><p>First</p></li><li><p>Second</p></li></ul>')
    editor.destroy()
  })
})
