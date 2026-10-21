'use client'

import { useTransition } from 'react'

import { deleteDocument } from '@/app/admin/actions'

export function DeleteButton({ collection, id }: { collection: string; id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm('Delete this for good? This cannot be undone.')) start(() => deleteDocument(collection, id))
      }}
      className="rounded-md border border-[#B42318]/50 bg-white px-2 py-1 text-xs font-medium text-[#B42318] hover:bg-[#B42318]/5 disabled:opacity-40"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
