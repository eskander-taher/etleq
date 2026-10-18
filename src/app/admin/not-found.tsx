import Link from 'next/link'

export default function AdminNotFound() {
  return (
    <main className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-bold">Not found</h1>
      <p className="mt-2 text-ink-600">This admin page does not exist, or you do not have access to it.</p>
      <Link href="/admin" className="mt-6 inline-block underline">
        Back to the dashboard
      </Link>
    </main>
  )
}
