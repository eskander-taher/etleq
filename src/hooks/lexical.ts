/**
 * Small helpers for Lexical rich-text JSON (the format Payload stores).
 */

type LexicalNode = { type: string; version: number; text?: string; children?: LexicalNode[]; [key: string]: unknown }
/** Matches the shape Payload generates for richText fields. */
export type LexicalRoot = {
  [k: string]: unknown
  root: {
    type: string
    children: LexicalNode[]
    direction: 'rtl' | 'ltr' | null
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
    indent: number
    version: number
  }
}

/** True when a Lexical value contains any non-whitespace text or a block node. */
export function lexicalHasContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const root = (value as LexicalRoot).root as unknown as LexicalNode | undefined
  if (!root) return false
  const walk = (node: LexicalNode): boolean => {
    if (node.type === 'block' || node.type === 'upload' || node.type === 'relationship') return true
    if (typeof node.text === 'string' && node.text.trim()) return true
    return Array.isArray(node.children) && node.children.some(walk)
  }
  return walk(root)
}

const textNode = (text: string, format = 0): LexicalNode => ({
  type: 'text',
  text,
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  version: 1,
})

const paragraphNode = (text: string): LexicalNode => ({
  type: 'paragraph',
  children: text ? [textNode(text)] : [],
  direction: null,
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  version: 1,
})

const headingNode = (text: string, tag: 'h2' | 'h3'): LexicalNode => ({
  type: 'heading',
  tag,
  children: [textNode(text)],
  direction: null,
  format: '',
  indent: 0,
  version: 1,
})

/**
 * Convert plain paragraphs into a Lexical root. Lines starting with `## ` or
 * `### ` become headings. Block nodes can be passed as objects and are
 * inserted as Lexical `block` nodes (`{ blockType, ...fields }`).
 */
export function toLexical(...parts: (string | { blockType: string; [key: string]: unknown })[]): LexicalRoot {
  const children: LexicalNode[] = parts.map((part, i) => {
    if (typeof part !== 'string') {
      return {
        type: 'block',
        version: 2,
        format: '',
        fields: { id: `blk${i}${Math.random().toString(36).slice(2, 10)}`, blockName: '', ...part },
      }
    }
    if (part.startsWith('### ')) return headingNode(part.slice(4), 'h3')
    if (part.startsWith('## ')) return headingNode(part.slice(3), 'h2')
    return paragraphNode(part)
  })
  return {
    root: { type: 'root', children, direction: null, format: '', indent: 0, version: 1 },
  }
}
