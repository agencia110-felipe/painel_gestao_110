import type { ResultadoDRE, ResultadoCliente } from '@/types'

/**
 * Monta o DRE consolidado a partir dos resultados por cliente.
 *
 * Reconciliação: a soma de custoTotal de todos os clientes deve bater com
 * folhaTotal + custoFixoTotal (± R$1 de arredondamento).
 *
 * custoOverheadInterno = folhaTotal - custoDiretoTotal - custoBackendTotal
 * (representa a folha de funcionários internos que não são diretos nem backend)
 */
export function buildDRE(
  resultadosClientes: ResultadoCliente[],
  folhaTotalInformativo: number,
  custoFixoTotal: number
): ResultadoDRE & { reconciliacao: { ok: boolean; delta: number } } {
  const receitaBruta = resultadosClientes.reduce((s, c) => s + c.faturamento, 0)
  const custoDiretoTotal = resultadosClientes.reduce((s, c) => s + c.custoDireto, 0)
  const custoBackendTotal = resultadosClientes.reduce((s, c) => s + c.custoBackendRateado, 0)
  const custoOverheadInterno = resultadosClientes.reduce((s, c) => s + c.custoOverheadRateado, 0)

  const custoTotalClientes = resultadosClientes.reduce((s, c) => s + c.custoTotal, 0)

  const resultadoLiquido = receitaBruta - custoTotalClientes
  const margemLiquida = receitaBruta > 0 ? resultadoLiquido / receitaBruta : null

  // Reconciliação: soma dos custos nos clientes deve = folha + fixo
  const totalEsperado = folhaTotalInformativo + custoFixoTotal
  const delta = Math.abs(custoTotalClientes - totalEsperado)

  return {
    receitaBruta,
    custoDiretoTotal,
    custoBackendTotal,
    folhaTotalInformativo,
    custoOverheadInterno,
    custoFixoTotal,
    resultadoLiquido,
    margemLiquida,
    reconciliacao: {
      ok: delta <= 1,
      delta,
    },
  }
}
