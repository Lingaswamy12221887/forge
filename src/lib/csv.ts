// CSV with formula-injection protection (cells starting with = + - @ are prefixed with ').
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => { let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n')
}
export function download(name: string, csv: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href) }
