export function formatCurrency(value: number): string {
  if (value < 0) {
    return `(R$ ${Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })})`
  }
  return `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

export function formatCurrencyFull(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')}%`
}

export function formatHours(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}h`
}

export function formatTrend(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1).replace('.', ',')}%`
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: decimals })
}

export function formatMesAno(mesAno: string): string {
  return mesAno
}

export function parseCurrencyBR(value: string): number {
  if (!value || value.trim() === '') return 0
  return parseFloat(
    value
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  ) || 0
}

export function parsePercentBR(value: string): number {
  if (!value || value.trim() === '') return 0
  return parseFloat(value.replace('%', '').replace(',', '.').trim()) / 100 || 0
}

// Converts "jan./24" or "jan/2024" → "Jan/2024"
export function normalizeMesAno(valor: string): string {
  if (!valor || valor.trim() === '') return ''
  const MESES_NORM: Record<string, string> = {
    'jan': 'Jan', 'jan.': 'Jan', 'fev': 'Fev', 'fev.': 'Fev',
    'mar': 'Mar', 'mar.': 'Mar', 'abr': 'Abr', 'abr.': 'Abr',
    'mai': 'Mai', 'mai.': 'Mai', 'jun': 'Jun', 'jun.': 'Jun',
    'jul': 'Jul', 'jul.': 'Jul', 'ago': 'Ago', 'ago.': 'Ago',
    'set': 'Set', 'set.': 'Set', 'out': 'Out', 'out.': 'Out',
    'nov': 'Nov', 'nov.': 'Nov', 'dez': 'Dez', 'dez.': 'Dez',
  }
  const lower = valor.trim().toLowerCase()
  // Already normalized (e.g. "Jan/2024")
  if (/^[A-Z][a-z]{2}\/\d{4}$/.test(valor.trim())) return valor.trim()
  const match = lower.match(/^([a-zç]+\.?)[\s\/]+(\d{2,4})$/)
  if (match) {
    const mesNorm = MESES_NORM[match[1]]
    if (!mesNorm) return valor.trim()
    const ano = match[2].length === 2 ? 2000 + parseInt(match[2]) : parseInt(match[2])
    return `${mesNorm}/${ano}`
  }
  return valor.trim()
}

// Converts "216:01:16" → 216.02 (decimal hours)
export function parseHHMMSS(value: string): number {
  if (!value || value.trim() === '') return 0
  const parts = value.trim().split(':')
  const h = parseInt(parts[0]) || 0
  const m = parts[1] ? parseInt(parts[1]) : 0
  const s = parts[2] ? parseInt(parts[2]) : 0
  return h + m / 60 + s / 3600
}
