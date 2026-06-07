export function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatCurrency(value?: number | null, currency = 'SEK') {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return '—'
  return `${value.toString().replace('.', ',')} %`
}
