import { notFound } from 'next/navigation'

// Any unknown path under a locale renders the localized not-found page inside the site shell.
export default function CatchAll() {
  notFound()
}
