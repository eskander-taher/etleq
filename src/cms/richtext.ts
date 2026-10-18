import { marked, type Token, type Tokens } from 'marked'

import { newId } from './db'
import { RICH_TEXT_BLOCK_SLUGS } from './schema/blocks'

/**
 * Rich text is stored as Markdown. Custom blocks are fenced code blocks whose
 * language is the block type and whose body is JSON:
 *
 *   ```callout
 *   { "tone": "tip", "title": "…", "body": "…" }
 *   ```
 *
 * GFM tables become `comparisonTable` blocks. On read, Markdown is converted
 * into the Lexical-shaped tree the site already renders (`RichText`,
 * `collectHeadings`, JSON-LD text extraction), so templates did not change.
 */

export type LexNode = { type: string; version: number; [key: string]: unknown }
export type LexRoot = {
  root: { type: 'root'; children: LexNode[]; direction: null; format: ''; indent: 0; version: 1 }
}

export const FORMAT = { bold: 1, italic: 2, strikethrough: 4, underline: 8, code: 16 } as const

const decode = (s: string) =>
  s.replace(
    /&(amp|lt|gt|quot|#39);/g,
    (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e] ?? _,
  )

const text = (value: string, format = 0): LexNode => ({
  type: 'text',
  text: decode(value),
  format,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})
const element = (type: string, children: LexNode[], extra: Record<string, unknown> = {}): LexNode => ({
  type,
  children,
  direction: null,
  format: '',
  indent: 0,
  version: 1,
  ...extra,
})

function inline(tokens: Token[] | undefined, format = 0): LexNode[] {
  const out: LexNode[] = []
  for (const token of tokens ?? []) {
    switch (token.type) {
      case 'strong':
        out.push(...inline((token as Tokens.Strong).tokens, format | FORMAT.bold))
        break
      case 'em':
        out.push(...inline((token as Tokens.Em).tokens, format | FORMAT.italic))
        break
      case 'del':
        out.push(...inline((token as Tokens.Del).tokens, format | FORMAT.strikethrough))
        break
      case 'codespan':
        out.push(text((token as Tokens.Codespan).text, format | FORMAT.code))
        break
      case 'br':
        out.push({ type: 'linebreak', version: 1 })
        break
      case 'link': {
        const link = token as Tokens.Link
        const url = link.href
        out.push(
          element('link', inline(link.tokens, format), {
            fields: { linkType: 'custom', url, newTab: /^https?:\/\//.test(url) },
          }),
        )
        break
      }
      case 'image': {
        const image = token as Tokens.Image
        out.push(
          element('link', [text(image.text || image.href, format)], {
            fields: { linkType: 'custom', url: image.href, newTab: true },
          }),
        )
        break
      }
      case 'text': {
        const t = token as Tokens.Text
        if (t.tokens?.length) out.push(...inline(t.tokens, format))
        else out.push(text(t.text, format))
        break
      }
      case 'escape':
        out.push(text((token as Tokens.Escape).text, format))
        break
      case 'html':
        out.push(text((token as Tokens.HTML).text, format))
        break
      default:
        if ('text' in token && typeof token.text === 'string') out.push(text(token.text, format))
    }
  }
  return out
}

function block(blockType: string, fields: Record<string, unknown>): LexNode {
  return { type: 'block', version: 2, format: '', fields: { id: newId(), blockName: '', ...fields, blockType } }
}

function blocks(tokens: Token[]): LexNode[] {
  const out: LexNode[] = []
  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const h = token as Tokens.Heading
        const level = Math.min(Math.max(h.depth, 2), 6)
        out.push(element('heading', inline(h.tokens), { tag: `h${level}` }))
        break
      }
      case 'paragraph':
        out.push(element('paragraph', inline((token as Tokens.Paragraph).tokens), { textFormat: 0, textStyle: '' }))
        break
      case 'text': {
        const t = token as Tokens.Text
        out.push(element('paragraph', inline(t.tokens ?? [token]), { textFormat: 0, textStyle: '' }))
        break
      }
      case 'list': {
        const list = token as Tokens.List
        out.push(
          element(
            'list',
            list.items.map((item, i) =>
              element(
                'listitem',
                item.tokens.flatMap((t) =>
                  t.type === 'text' || t.type === 'paragraph' ? inline((t as Tokens.Text).tokens ?? [t]) : blocks([t]),
                ),
                { value: i + 1 },
              ),
            ),
            {
              listType: list.ordered ? 'number' : 'bullet',
              tag: list.ordered ? 'ol' : 'ul',
              start: Number(list.start) || 1,
            },
          ),
        )
        break
      }
      case 'blockquote':
        out.push(
          element(
            'quote',
            blocks((token as Tokens.Blockquote).tokens).flatMap((n) =>
              n.type === 'paragraph' ? (n.children as LexNode[]) : [n],
            ),
          ),
        )
        break
      case 'hr':
        out.push({ type: 'horizontalrule', version: 1 })
        break
      case 'code': {
        const code = token as Tokens.Code
        const lang = (code.lang || '').trim()
        if (RICH_TEXT_BLOCK_SLUGS.includes(lang)) {
          try {
            const fields = JSON.parse(code.text || '{}') as Record<string, unknown>
            out.push(block(lang, fields && typeof fields === 'object' ? fields : {}))
            break
          } catch {
            // Invalid JSON: fall through and show it as code so the editor sees the problem.
          }
        }
        out.push(element('code', [text(code.text)], { language: lang || null }))
        break
      }
      case 'table': {
        const table = token as Tokens.Table
        out.push(
          block('comparisonTable', {
            columns: table.header.slice(1).map((cell) => ({ id: newId(), label: decode(cell.text), highlight: false })),
            rows: table.rows.map((row) => ({
              id: newId(),
              label: decode(row[0]?.text ?? ''),
              cells: row.slice(1).map((cell) => ({ id: newId(), value: decode(cell.text) })),
            })),
            caption: decode(table.header[0]?.text ?? ''),
          }),
        )
        break
      }
      default:
        break
    }
  }
  return out
}

/** Markdown → Lexical-shaped tree. */
export function markdownToLexical(markdown: string): LexRoot {
  const tokens = marked.lexer(markdown || '', { gfm: true, breaks: false })
  return { root: { type: 'root', children: blocks(tokens), direction: null, format: '', indent: 0, version: 1 } }
}

/** Stored rich-text value → tree for rendering. Legacy Lexical JSON passes through. */
export function richTextValue(value: unknown): LexRoot | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') return markdownToLexical(value)
  if (typeof value === 'object' && 'root' in (value as object)) return value as LexRoot
  return null
}

/* ------------------------------------------------------------------ */
/* Authoring helpers                                                   */
/* ------------------------------------------------------------------ */

type BlockPart = { blockType: string; [key: string]: unknown }

/** A block as a Markdown fence. */
export function blockFence({ blockType, ...fields }: BlockPart): string {
  return `\`\`\`${blockType}\n${JSON.stringify(fields, null, 2)}\n\`\`\``
}

/** Join paragraphs (strings, `## ` headings allowed) and blocks into Markdown. */
export function toMarkdown(...parts: (string | BlockPart)[]): string {
  return parts.map((part) => (typeof part === 'string' ? part : blockFence(part))).join('\n\n')
}

/** Legacy Lexical JSON (data written by Payload) → Markdown for the editor. */
export function lexicalToMarkdown(value: unknown): string {
  const root = (value as { root?: { children?: LexNode[] } } | null)?.root
  if (!root) return typeof value === 'string' ? value : ''
  const inlineMd = (nodes: LexNode[] = []): string =>
    nodes
      .map((n) => {
        if (n.type === 'text') {
          let s = String(n.text ?? '')
          const f = Number(n.format) || 0
          if (f & FORMAT.code) s = `\`${s}\``
          if (f & FORMAT.bold) s = `**${s}**`
          if (f & FORMAT.italic) s = `*${s}*`
          return s
        }
        if (n.type === 'linebreak') return '  \n'
        if (n.type === 'link' || n.type === 'autolink') {
          const url = (n.fields as { url?: string } | undefined)?.url ?? '#'
          return `[${inlineMd(n.children as LexNode[])}](${url})`
        }
        return inlineMd(n.children as LexNode[])
      })
      .join('')
  const blockMd = (n: LexNode): string => {
    switch (n.type) {
      case 'heading':
        return `${'#'.repeat(Number(String(n.tag).slice(1)) || 2)} ${inlineMd(n.children as LexNode[])}`
      case 'list':
        return (n.children as LexNode[])
          .map((li, i) => `${n.listType === 'number' ? `${i + 1}.` : '-'} ${inlineMd(li.children as LexNode[])}`)
          .join('\n')
      case 'quote':
        return `> ${inlineMd(n.children as LexNode[])}`
      case 'horizontalrule':
        return '---'
      case 'block': {
        const {
          id: _id,
          blockName: _name,
          ...fields
        } = (n.fields ?? {}) as BlockPart & { id?: string; blockName?: string }
        return blockFence(fields as BlockPart)
      }
      default:
        return inlineMd(n.children as LexNode[])
    }
  }
  return (root.children ?? []).map(blockMd).join('\n\n')
}
