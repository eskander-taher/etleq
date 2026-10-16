import type { Graph, Thing, WithContext } from 'schema-dts'

type JsonLdData = Graph | WithContext<Exclude<Thing, string>> | Record<string, unknown>

const LS = new RegExp(String.fromCharCode(0x2028), 'g')
const PS = new RegExp(String.fromCharCode(0x2029), 'g')

/** Serialize JSON-LD, escaping characters that could break out of the <script> element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029')
}

/** Server component: renders one <script type="application/ld+json">. */
export function JsonLd({ data }: { data: JsonLdData | null | undefined }) {
  if (!data) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}

export default JsonLd
