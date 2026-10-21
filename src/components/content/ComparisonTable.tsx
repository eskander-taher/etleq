import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComparisonTableData = {
  columns?: { label?: string | null }[] | null
  rows?: { label?: string | null; cells?: { value?: string | null; sourceUrl?: string | null }[] | null }[] | null
}

/** Plain HTML table so search engines and assistants can lift the figures. Scrolls horizontally on phones. */
export function ComparisonTable({
  data,
  caption,
  sourceLabel,
  className,
}: {
  data: ComparisonTableData | null | undefined
  caption?: string
  sourceLabel: string
  className?: string
}) {
  const columns = data?.columns ?? []
  const rows = data?.rows ?? []
  if (!columns.length || !rows.length) return null
  // Editors may or may not give the row-label column a header; detect it from the cell count.
  const maxCells = Math.max(...rows.map((r) => r.cells?.length ?? 0))
  const labelHeader = maxCells < columns.length ? columns[0] : null
  const dataColumns = labelHeader ? columns.slice(1) : columns
  return (
    <div className={cn('relative overflow-x-auto rounded-[var(--radius-card)] border border-sand-300', className)}>
      <table className="w-full min-w-[560px] border-collapse text-start text-sm">
        {caption && <caption className="p-4 text-start font-semibold">{caption}</caption>}
        <thead className="bg-sand-100">
          <tr>
            <th scope="col" className="p-3 text-start font-semibold">
              {labelHeader?.label}
            </th>
            {dataColumns.map((c, i) => (
              <th key={i} scope="col" className="p-3 text-start font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-sand-300 align-top">
              <th scope="row" className="p-3 text-start font-semibold">
                {row.label}
              </th>
              {(row.cells ?? []).slice(0, dataColumns.length).map((cell, c) => (
                <td key={c} className="p-3">
                  <span>{cell.value}</span>
                  {cell.sourceUrl && (
                    <a
                      href={cell.sourceUrl}
                      rel="noopener nofollow"
                      target="_blank"
                      className="ms-1 inline-flex items-center gap-0.5 text-xs text-ignition-700 underline"
                    >
                      {sourceLabel}
                      <ExternalLink aria-hidden className="size-3" />
                    </a>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
