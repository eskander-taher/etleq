// Guardrail 7: fail on physical-direction Tailwind utilities. Allow a line with `logical-css-allow: <reason>`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const EXT = /\.(tsx?|jsx?|css|mdx?)$/
const SKIP = [/[\/]\(payload\)[\/]/, /payload-types\.ts$/, /importMap\.js$/]
const BAD =
  /(?<![\w-])(?:-?(?:ml|mr|pl|pr|left|right|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|border-l|border-r|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-[\w./[\]-]+|text-left|text-right|float-left|float-right|clear-left|clear-right|border-l|border-r|rounded-l|rounded-r)(?![\w-])/g

const files = []
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (EXT.test(f) && !SKIP.some((r) => r.test(p))) files.push(p)
  }
}
walk(ROOT)

const hits = []
for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('logical-css-allow')) return
      // Only inspect class-like strings: className, cn(), cva, @apply
      if (!/class(Name)?=|cn\(|cva\(|@apply|clsx\(|'[^']*\b(ml|mr|pl|pr|left|right|text-left|text-right)-?/.test(line)) return
      for (const m of line.matchAll(BAD)) hits.push(`${file}:${i + 1}  ${m[0]}`)
    })
}

if (hits.length) {
  console.error(`Physical-direction utilities found (use ms/me/ps/pe/start/end/text-start/text-end):\n${hits.join('\n')}`)
  process.exit(1)
}
console.log(`logical-css: OK (${files.length} files)`)
