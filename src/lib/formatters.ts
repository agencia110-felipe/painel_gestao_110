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

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: decimals })
}

// 'YYYY-MM' → 'Jan/2026'
export function formatMesAno(mesAno: string): string {
  if (!mesAno || !mesAno.includes('-')) return mesAno
  const [ano, mes] = mesAno.split('-')
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const idx = parseInt(mes) - 1
  return `${MESES[idx] ?? mes}/${ano}`
}

// HH:MM:SS → horas decimais
export function parseHHMMSS(value: string): number {
  if (!value || value.trim() === '') return 0
  const parts = value.trim().split(':')
  const h = parseInt(parts[0]) || 0
  const m = parts[1] ? parseInt(parts[1]) : 0
  const s = parts[2] ? parseInt(parts[2]) : 0
  return h + m / 60 + s / 3600
}

// 'YYYY-MM-DD HH:MM:SS' ou 'YYYY-MM-DD' → 'YYYY-MM'
export function parseDateToMesAno(value: string): string | null {
  if (!value || value.trim() === '') return null
  const match = value.trim().match(/^(\d{4})-(\d{2})/)
  if (!match) return null
  const ano = match[1]
  const mes = match[2]
  // Rejeitar datas inválidas tipo 1800-xx
  if (parseInt(ano) < 2000) return null
  return `${ano}-${mes}`
}
