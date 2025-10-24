'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Page } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

interface EditorProps {
  page: Page
  onUpdate: (page: Page) => void
}

export default function Editor({ page, onUpdate }: EditorProps) {
  const [title, setTitle] = useState(page.title)
  const [content, setContent] = useState(page.content)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setTitle(page.title)
    setContent(page.content)
    if (contentRef.current) {
      contentRef.current.innerHTML = page.content
    }
  }, [page.id])

  const savePage = async (newTitle: string, newContent: string) => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({
          title: newTitle,
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id)
        .select()
        .single()

      if (error) throw error
      if (data) onUpdate(data)
    } catch (error) {
      console.error('Error saving page:', error)
    } finally {
      setSaving(false)
    }
  }

  const debouncedSave = (newTitle: string, newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePage(newTitle, newContent)
    }, 1000)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    debouncedSave(newTitle, content)
  }

  const handleContentInput = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML
      setContent(newContent)
      debouncedSave(title, newContent)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${page.user_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('page-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('page-images')
        .getPublicUrl(filePath)

      if (contentRef.current) {
        const img = document.createElement('img')
        img.src = publicUrl
        img.alt = 'Uploaded image'
        img.style.maxWidth = '100%'
        img.style.borderRadius = '0.5rem'
        img.style.margin = '1rem 0'

        contentRef.current.appendChild(img)
        contentRef.current.appendChild(document.createElement('p'))

        const newContent = contentRef.current.innerHTML
        setContent(newContent)
        savePage(title, newContent)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    handleContentInput()
  }

  const insertHeading = (level: number) => {
    document.execCommand('formatBlock', false, `h${level}`)
    handleContentInput()
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => insertHeading(1)}
          className="px-3 py-1.5 rounded hover:bg-gray-100 text-sm font-semibold"
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => insertHeading(2)}
          className="px-3 py-1.5 rounded hover:bg-gray-100 text-sm font-semibold"
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => insertHeading(3)}
          className="px-3 py-1.5 rounded hover:bg-gray-100 text-sm font-semibold"
          title="Heading 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => formatText('bold')}
          className="px-3 py-1.5 rounded hover:bg-gray-100 font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => formatText('italic')}
          className="px-3 py-1.5 rounded hover:bg-gray-100 italic"
          title="Italic"
        >
          I
        </button>
        <button
          onClick={() => formatText('underline')}
          className="px-3 py-1.5 rounded hover:bg-gray-100 underline"
          title="Underline"
        >
          U
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => formatText('insertUnorderedList')}
          className="px-3 py-1.5 rounded hover:bg-gray-100"
          title="Bullet List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <button
          onClick={() => formatText('insertOrderedList')}
          className="px-3 py-1.5 rounded hover:bg-gray-100"
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50"
          title="Upload Image"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {uploading && <span className="text-xs">Uploading...</span>}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="flex-1" />
        <div className="text-xs text-gray-500">
          {saving ? 'Saving...' : 'Saved'}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="w-full text-4xl font-bold outline-none border-none mb-4 placeholder-gray-300"
            placeholder="Untitled"
          />
          <div
            ref={contentRef}
            contentEditable
            onInput={handleContentInput}
            className="editor-content outline-none min-h-[500px]"
            data-placeholder="Start typing..."
            suppressContentEditableWarning
          />
        </div>
      </div>
    </div>
  )
}
