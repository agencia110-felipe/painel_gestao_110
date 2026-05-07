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
