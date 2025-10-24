'use client'

import { useEffect, useState } from 'react'
import { supabase, Page } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Editor from './Editor'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setPages(data || [])

      if (data && data.length > 0 && !selectedPage) {
        setSelectedPage(data[0])
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewPage = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert([
          {
            user_id: user.id,
            title: 'Untitled',
            content: '',
          },
        ])
        .select()
        .single()

      if (error) throw error
      setPages([data, ...pages])
      setSelectedPage(data)
    } catch (error) {
      console.error('Error creating page:', error)
    }
  }

  const deletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)

      if (error) throw error

      const updatedPages = pages.filter((p) => p.id !== pageId)
      setPages(updatedPages)

      if (selectedPage?.id === pageId) {
        setSelectedPage(updatedPages[0] || null)
      }
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">My Pages</h1>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
              title="Sign Out"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
          <button
            onClick={createNewPage}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + New Page
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {pages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-8">
              No pages yet. Create your first page!
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1 ${
                  selectedPage?.id === page.id
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => setSelectedPage(page)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {page.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePage(page.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-2 text-red-600 hover:text-red-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="text-sm text-gray-600">
            {user.email}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedPage ? (
            <Editor
              key={selectedPage.id}
              page={selectedPage}
              onUpdate={(updatedPage) => {
                setPages(pages.map((p) => (p.id === updatedPage.id ? updatedPage : p)))
                setSelectedPage(updatedPage)
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  No page selected
                </h2>
                <p className="text-gray-600">
                  Create a new page or select one from the sidebar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
