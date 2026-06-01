import { useState, useMemo, useEffect } from 'react'
import { CheckCircle, XCircle, RefreshCw, Download, Upload, Trash2, AlertTriangle, FileText, Zap, X, Link2 } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useConfigStore } from '@/store/useConfigStore'
import { useCustosStore } from '@/store/useCustosStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useRelatorioStore } from '@/store/useRelatorioStore'
import { useIClipsStore } from '@/store/useIClipsStore'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { MAPA_CLIENTES_RELATORIO } from '@/lib/parseRelatorio'
import { normalizarNome, buildCustoHoraMapa, buscarCustoHoraPorNome } from '@/lib/calculations'
import type { ConfigParams } from '@/types'

export function Configuracoes() {
  const { params, pacotes, sheets, setParam, resetParams, updatePacote, setSheetsConfig } = useConfigStore()
  const { equipe, fixos, variaveis, addMembro, addFixo, addVariavel, removeMembro, removeFixo, removeVariavel } = useCustosStore()
  const { clientes, lastSync, error } = useSheetsStore()
  const {
    relatorios, mapeamentoCustom,
    mapeamentosColaboradores, colaboradoresIgnorados,
    mapeamentosClientes,
    addRelatorio, removeRelatorio, addMapeamento,
    addMapeamentoColaborador, removeMapeamentoColaborador,
    addIgnorado, removeIgnorado,
    addMapeamentoCliente, removeMapeamentoCliente,
  } = useRelatorioStore()
  const { relatorio: iClipsRelatorio, loading: iClipsLoading, error: iClipsError, lastSync: iClipsSyncAt } = useIClipsStore()

  // Estado dos dropdowns da tabela de equivalência (nomeIClips → nomeStore selecionado)
  const [selecoes, setSelecoes] = useState<Record<string, string>>({})

  // Relatorio iClips do store PERSISTIDO (não depende do fetch em-memória)
  const iClipsRel = useMemo(() => relatorios.find(r => r.id === 'iclips-live'), [relatorios])

  // Todos os colaboradores únicos do iClips (do relatorio persistido, não do in-memory)
  const todosColabIClips = useMemo(() => {
    const rel = iClipsRel ?? iClipsRelatorio
    if (!rel) return []
    return [...new Set(rel.resumos.map(r => r.colaborador))]
  }, [iClipsRel, iClipsRelatorio])

  // Mapa custo/hora local — replica o do useFilteredSheets para calcular pendentes aqui
  const custoHoraMapaLocal = useMemo(() => {
    const mapa = buildCustoHoraMapa(equipe, params.horasMes, params.aproveitamentoPct)
    for (const { nomeIClips, nomeStore } of mapeamentosColaboradores) {
      const custoH = mapa.get(normalizarNome(nomeStore))
      if (custoH !== undefined) {
        const chave = normalizarNome(nomeIClips)
        if (!mapa.has(chave)) mapa.set(chave, custoH)
      }
    }
    return mapa
  }, [equipe, params.horasMes, params.aproveitamentoPct, mapeamentosColaboradores])

  // Pendentes = colaboradores do iClips que não estão no store, não foram mapeados e não foram ignorados.
  // Usa o relatorio COMPLETO (sem filtro de período) para nunca ficar vazio por causa do mês selecionado.
  const pendentes = useMemo(() => {
    return todosColabIClips.filter(nome =>
      !mapeamentosColaboradores.some(m => m.nomeIClips === nome) &&
      !colaboradoresIgnorados.includes(nome) &&
      !buscarCustoHoraPorNome(custoHoraMapaLocal, nome)
    )
  }, [todosColabIClips, mapeamentosColaboradores, colaboradoresIgnorados, custoHoraMapaLocal])

  // Sugestão automática: membro do store com mesmo primeiro nome
  const sugestoesMap = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const nomeIClips of pendentes) {
      const primeiroIClips = normalizarNome(nomeIClips).split(' ')[0]
      const candidatos = equipe.filter(
        m => m.status === 'Ativo' && normalizarNome(m.nome).split(' ')[0] === primeiroIClips
      )
      if (candidatos.length === 1) mapa[nomeIClips] = candidatos[0].nome
    }
    return mapa
  }, [pendentes, equipe])

  // Pré-preencher dropdowns com sugestões automáticas (não sobrescreve escolhas do usuário)
  useEffect(() => {
    setSelecoes(prev => {
      const updates: Record<string, string> = {}
      for (const [nomeIClips, sugestao] of Object.entries(sugestoesMap)) {
        if (!prev[nomeIClips]) updates[nomeIClips] = sugestao
      }
      return Object.keys(updates).length > 0 ? { ...updates, ...prev } : prev
    })
  }, [sugestoesMap])

  const autoCount = Math.max(
    0,
    todosColabIClips.length - pendentes.length - mapeamentosColaboradores.length - colaboradoresIgnorados.length
  )

  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [novosMapeamentos, setNovosMapeamentos] = useState<Record<string, string>>({})
  const [expandirNaoMapeados, setExpandirNaoMapeados] = useState(false)
  const [selClientes, setSelClientes] = useState<Record<string, string>>({})

  async function handleTestConnection() {
    if (!sheets.spreadsheetId || !sheets.apiKey) {
      setTestStatus('error')
      setTestMsg('Preencha o Spreadsheet ID e a API Key antes de testar.')
      return
    }
    setTestStatus('loading')
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheets.spreadsheetId}?key=${sheets.apiKey}&fields=properties.title`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTestStatus('ok')
        setTestMsg(`Conectado: "${data.properties?.title || 'Planilha sem título'}"`)
      } else {
        const data = await res.json()
        setTestStatus('error')
        setTestMsg(data.error?.message || `Erro HTTP ${res.status}`)
      }
    } catch (e) {
      setTestStatus('error')
      setTestMsg('Falha de rede ao tentar conectar.')
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({ equipe, fixos, variaveis }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agencia110-dados-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.equipe && Array.isArray(data.equipe)) {
          equipe.forEach(m => removeMembro(m.id))
          data.equipe.forEach((m: Parameters<typeof addMembro>[0]) => addMembro(m))
        }
        if (data.fixos && Array.isArray(data.fixos)) {
          fixos.forEach(f => removeFixo(f.id))
          data.fixos.forEach((f: Parameters<typeof addFixo>[0]) => addFixo(f))
        }
        if (data.variaveis && Array.isArray(data.variaveis)) {
          variaveis.forEach(v => removeVariavel(v.id))
          data.variaveis.forEach((v: Parameters<typeof addVariavel>[0]) => addVariavel(v))
        }
        alert('Dados importados com sucesso!')
      } catch {
        alert('Erro ao ler o arquivo. Certifique-se de que é um JSON válido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClearData() {
    if (!clearConfirm) { setClearConfirm(true); return }
    localStorage.removeItem('agencia110-custos')
    localStorage.removeItem('agencia110-config')
    setClearConfirm(false)
    window.location.reload()
  }

  function formatMesRelatorio(mes: string): string {
    const MESES: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    }
    const [y, m] = mes.split('-')
    return `${MESES[m] || m}/${y}`
  }

  // Clientes sem mapeamento: excluir os que já foram vinculados via store ou mapeamentoCustom
  const clientesSemMapeamento = [...new Set(
    relatorios.flatMap(r => r.clientesNaoMapeados.filter(c =>
      !mapeamentoCustom[c] && !mapeamentosClientes.some(m => m.nomeIClips === c)
    ))
  )]

  // Nomes canônicos para o dropdown: combina Sheets + mapa fixo
  const clientesCanônicos = useMemo(() => {
    const fromSheets = clientes.map(c => c.cliente)
    const fromMapa = Object.values(MAPA_CLIENTES_RELATORIO).filter(v => !v.startsWith('__'))
    return [...new Set([...fromSheets, ...fromMapa])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [clientes])

  // Pendentes de mapeamento (do relatorio completo, não filtrado por período)
  const clientesPendentes = useMemo(() => {
    const naoMapeados = iClipsRel?.clientesNaoMapeados ?? []
    return naoMapeados.filter(nome => !mapeamentosClientes.some(m => m.nomeIClips === nome))
  }, [iClipsRel, mapeamentosClientes])

  // Sugestão automática: detecta padrões como "Audi - Servopa" → "Servopa"
  // ou "PR - Bom Jesus Aldeia" → "Bom Jesus"
  const sugestoesClientes = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const nomeIClips of clientesPendentes) {
      const norm = nomeIClips.toLowerCase()
      // Padrão "Marca/Região - Cliente" → extrair parte após " - "
      const matchSufixo = norm.match(/^.+?\s+-\s+(.+)$/)
      const sufixo = matchSufixo ? matchSufixo[1].trim() : norm
      // Remover prefixo de estado (ex: "PR - ") → extrair só o nome
      const matchSemEstado = sufixo.match(/^[a-z]{2}\s+-\s+(.+)$/)
      const nomeChave = matchSemEstado ? matchSemEstado[1].trim() : sufixo
      // Buscar cliente canônico que começa com a primeira palavra-chave
      const primeiraChave = nomeChave.split(' ')[0]
      const encontrado = clientesCanônicos.find(c =>
        c.toLowerCase().startsWith(primeiraChave) ||
        nomeChave.startsWith(c.toLowerCase())
      )
      if (encontrado) mapa[nomeIClips] = encontrado
    }
    return mapa
  }, [clientesPendentes, clientesCanônicos])

  // Pré-preencher dropdowns de clientes com sugestões automáticas
  useEffect(() => {
    setSelClientes(prev => {
      const updates: Record<string, string> = {}
      for (const [nome, sugestao] of Object.entries(sugestoesClientes)) {
        if (!prev[nome]) updates[nome] = sugestao
      }
      return Object.keys(updates).length > 0 ? { ...updates, ...prev } : prev
    })
  }, [sugestoesClientes])

  const paramFields: { key: keyof ConfigParams; label: string; min: number; max: number; step: number; pct: boolean }[] = [
    { key: 'horasMes',              label: 'Horas/mês',                   min: 1,   max: 300, step: 1,   pct: false },
    { key: 'aproveitamentoPct',     label: 'Aproveitamento (%)',          min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'gatilhoContratacaoPct', label: 'Gatilho de contratação (%)',  min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'margemDesejadaPct',     label: 'Margem desejada (%)',         min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'fatorComplexidadePct',  label: 'Fator de complexidade (%)',   min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'trafegoPctPacote',      label: 'Tráfego % do pacote',         min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'socialMediaPctPacote',  label: 'Social Media % do pacote',    min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'smAtendimentoPct',      label: 'SM Atendimento %',            min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'smCriacaoPct',          label: 'SM Criação %',                min: 0,   max: 100, step: 1,   pct: true  },
    { key: 'smRevisaoPct',          label: 'SM Revisão %',                min: 0,   max: 100, step: 1,   pct: true  },
  ]

  function getParamValue(f: typeof paramFields[0]): number {
    const raw = params[f.key] as number
    return f.pct ? Math.round(raw * 100) : raw
  }

  function setParamValue(f: typeof paramFields[0], val: number) {
    setParam(f.key, f.pct ? val / 100 : val)
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral">Configurações</h1>
        <p className="text-sm text-muted mt-1">Integrações, parâmetros e gestão de dados</p>
      </div>

      <div className="space-y-6">

        {/* ── Seção 1: Google Sheets ── */}
        <section className="bg-white rounded-xl border border-border p-5">
          <h2 className="font-semibold text-neutral mb-4">Integração Google Sheets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted mb-1 block">Spreadsheet ID (Receitas / Colaboradores)</label>
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                value={sheets.spreadsheetId}
                onChange={e => setSheetsConfig({ spreadsheetId: e.target.value })}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">API Key</label>
              <input
                type="password"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                value={sheets.apiKey}
                onChange={e => setSheetsConfig({ apiKey: e.target.value })}
                placeholder="AIza..."
              />
            </div>
          </div>

          {/* iClips Spreadsheet */}
          <div className="mb-4">
            <label className="text-xs text-muted mb-1 flex items-center gap-1.5 block">
              <Zap size={11} className="text-primary" />
              Spreadsheet ID do iClips (relatório de tarefas automático)
            </label>
            <input
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              value={sheets.iClipsSpreadsheetId}
              onChange={e => setSheetsConfig({ iClipsSpreadsheetId: e.target.value })}
              placeholder="12UxWnfp6n5CqTMXSGqA_fcU2k0JcwOS-ay0JAC09NmY"
            />
            {/* Status iClips */}
            {sheets.iClipsSpreadsheetId && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {iClipsLoading ? (
                  <><RefreshCw size={12} className="animate-spin text-primary" /><span className="text-muted">Buscando dados do iClips…</span></>
                ) : iClipsError ? (
                  <><XCircle size={12} className="text-danger" /><span className="text-danger">{iClipsError}</span></>
                ) : iClipsRelatorio ? (
                  <><CheckCircle size={12} className="text-success" />
                  <span className="text-muted">
                    {iClipsRelatorio.totalTarefas.toLocaleString('pt-BR')} tarefas · {iClipsRelatorio.totalColaboradores} colaboradores · {iClipsRelatorio.mesesCobertos.length} mês(es)
                    {iClipsSyncAt && ` · sync ${iClipsSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                  </span></>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer select-none">
              <div
                onClick={() => setSheetsConfig({ autoRefresh: !sheets.autoRefresh })}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${sheets.autoRefresh ? 'bg-primary' : 'bg-neutral/20'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform shadow ${sheets.autoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              Atualização automática (30 min)
            </label>
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-4">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'loading'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={testStatus === 'loading' ? 'animate-spin' : ''} />
              {testStatus === 'loading' ? 'Testando...' : 'Testar conexão'}
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:text-neutral transition-colors"
            >
              {showRaw ? 'Ocultar' : 'Ver dados brutos'}
            </button>
          </div>

          {testStatus !== 'idle' && testStatus !== 'loading' && (
            <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border ${testStatus === 'ok' ? 'bg-success-bg border-success/30 text-success' : 'bg-danger-bg border-danger/30 text-danger'}`}>
              {testStatus === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testMsg}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-bg-page rounded-lg px-4 py-3">
              <p className="text-xs text-muted mb-0.5">Última sincronização</p>
              <p className="font-medium text-neutral">{lastSync ? lastSync.toLocaleString('pt-BR') : '—'}</p>
            </div>
            <div className="bg-bg-page rounded-lg px-4 py-3">
              <p className="text-xs text-muted mb-0.5">Status</p>
              <p className={`font-medium ${error ? 'text-danger' : 'text-success'}`}>{error ? `Erro: ${error}` : 'OK'}</p>
            </div>
          </div>

          {showRaw && (
            <div className="mt-4">
              <p className="text-xs text-muted mb-2">Primeiros 3 clientes (dados brutos):</p>
              <pre className="bg-bg-page rounded-lg p-4 text-xs font-mono text-neutral overflow-auto max-h-48 border border-border">
                {JSON.stringify(clientes.slice(0, 3), null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* ── Seção 2: Parâmetros Operacionais ── */}
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral">Parâmetros Operacionais</h2>
            <button
              onClick={resetParams}
              className="text-sm text-muted hover:text-danger transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Restaurar padrões
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {paramFields.map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted mb-1 block">{f.label}</label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={getParamValue(f)}
                  onChange={e => setParamValue(f, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Seção 3: Pacotes Base ── */}
        <section className="bg-white rounded-xl border border-border p-5">
          <h2 className="font-semibold text-neutral mb-4">Pacotes Base</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Nome</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Horas</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Preço Antigo (R$)</th>
                </tr>
              </thead>
              <tbody>
                {pacotes.map((p, i) => (
                  <tr key={p.nome} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <input
                        className="w-full text-sm text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                        defaultValue={p.nome}
                        onBlur={e => updatePacote(i, { nome: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        className="w-20 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                        defaultValue={p.horas}
                        onBlur={e => updatePacote(i, { horas: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        className="w-28 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                        defaultValue={p.precoAntigo}
                        onBlur={e => updatePacote(i, { precoAntigo: Number(e.target.value) })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Seção 4: Dados de Tarefas (iClips) ── */}
        <section className="bg-white rounded-xl border border-border p-5">
          <h2 className="font-semibold text-neutral mb-1">Dados de Tarefas (iClips)</h2>
          <p className="text-xs text-muted mb-4">
            Horas e custos por cliente sincronizados automaticamente via Google Sheets.
            Configure o Spreadsheet ID do iClips acima e clique em Atualizar.
          </p>

          {relatorios.filter(r => r.id !== 'iclips-live').length === 0 && relatorios.find(r => r.id === 'iclips-live') == null ? (
            <div className="flex items-center gap-2 text-sm text-muted bg-bg-page rounded-lg px-4 py-3 border border-border">
              <AlertTriangle size={14} className="text-warning shrink-0" />
              Nenhum dado disponível. Verifique o Spreadsheet ID do iClips acima.
            </div>
          ) : (
            <div className="space-y-2">
              {relatorios.map(r => {
                const inicio = formatMesRelatorio(r.periodoInicio)
                const fim = r.periodoFim !== r.periodoInicio ? `–${formatMesRelatorio(r.periodoFim)}` : ''
                const dataImport = new Date(r.dataImport).toLocaleDateString('pt-BR')
                const isIClips = r.id === 'iclips-live'
                return (
                  <div key={r.id} className="flex items-center justify-between bg-bg-page rounded-lg px-4 py-3 border border-border">
                    <div className="flex items-center gap-3">
                      {isIClips
                        ? <Zap size={16} className="text-primary shrink-0" />
                        : <FileText size={16} className="text-muted shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-medium text-neutral">
                          {inicio}{fim} · {r.totalColaboradores} colaboradores · {r.totalTarefas.toLocaleString('pt-BR')} tarefas
                          {isIClips && <span className="ml-2 text-xs text-primary font-normal">iClips (automático)</span>}
                        </p>
                        <p className="text-xs text-muted">
                          Sincronizado em {dataImport}
                          {r.clientesNaoMapeados.length > 0 && (
                            <button
                              onClick={() => setExpandirNaoMapeados(v => !v)}
                              className="ml-2 text-warning hover:underline focus:outline-none"
                            >
                              · {r.clientesNaoMapeados.length} cliente(s) sem mapeamento
                              {expandirNaoMapeados ? ' ▲' : ' ▼'}
                            </button>
                          )}
                        </p>
                        {r.clientesNaoMapeados.length > 0 && expandirNaoMapeados && (
                          <div className="mt-2 p-3 bg-warning-bg border border-warning/30 rounded-lg">
                            <p className="text-xs text-muted mb-2">
                              Estes nomes aparecem no iClips mas não foram reconhecidos pelo mapa de clientes.
                              Serão ignorados nos cálculos até serem mapeados abaixo.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {r.clientesNaoMapeados.map(nome => (
                                <code key={nome} className="text-xs px-2 py-0.5 bg-white border border-warning/30 rounded text-neutral">
                                  {nome}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {!isIClips && (
                      <button
                        onClick={() => removeRelatorio(r.id)}
                        title="Remover dados importados manualmente"
                        className="text-muted hover:text-danger transition-colors ml-4 shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {clientesSemMapeamento.length > 0 && (
            <div className="mt-4 border border-warning/40 rounded-xl p-4 bg-warning-bg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-warning" />
                <span className="text-sm font-medium text-warning">
                  {clientesSemMapeamento.length} cliente(s) do iClips sem mapeamento — associe ao cliente do sistema
                </span>
              </div>
              <div className="space-y-2">
                {clientesSemMapeamento.map(raw => (
                  <div key={raw} className="flex items-center gap-3">
                    <span className="text-sm font-mono text-neutral bg-white border border-border rounded px-2 py-1 min-w-[180px]">
                      "{raw}"
                    </span>
                    <span className="text-muted text-sm">→</span>
                    <select
                      className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={novosMapeamentos[raw] || ''}
                      onChange={e => setNovosMapeamentos(p => ({ ...p, [raw]: e.target.value }))}
                    >
                      <option value="">Selecione…</option>
                      <option value="__OVERHEAD__">Ignorar (overhead)</option>
                      {clientesCanônicos.sort().map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      disabled={!novosMapeamentos[raw]}
                      onClick={() => {
                        addMapeamento(raw, novosMapeamentos[raw])
                        setNovosMapeamentos(p => { const n = { ...p }; delete n[raw]; return n })
                      }}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Seção: Mapeamento de Clientes ── */}
        {(clientesPendentes.length > 0 || mapeamentosClientes.length > 0) && (
          <section className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-1">
              <Link2 size={15} className="text-primary" />
              <h2 className="font-semibold text-neutral">Clientes — Mapeamento de Nomes</h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Associe nomes do iClips aos clientes cadastrados. Feito uma vez, o vínculo é permanente.
              Após salvar, clique em <strong>Atualizar</strong> para reprocessar os dados.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {clientesPendentes.length > 0 && (
                <span className="flex items-center gap-1 bg-warning-bg text-warning border border-warning/20 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={11} /> {clientesPendentes.length} aguardando vínculo
                </span>
              )}
              {mapeamentosClientes.length > 0 && (
                <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5">
                  <Link2 size={11} /> {mapeamentosClientes.length} vinculados
                </span>
              )}
              {clientesPendentes.length === 0 && mapeamentosClientes.length > 0 && (
                <span className="flex items-center gap-1 bg-success-bg text-success border border-success/20 rounded-lg px-3 py-1.5">
                  <CheckCircle size={11} /> Todos mapeados
                </span>
              )}
            </div>

            {/* Tabela de pendentes */}
            {clientesPendentes.length > 0 && (
              <div className="mb-5 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-page border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Nome no iClips</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Cliente no sistema</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesPendentes.map(nomeIClips => {
                      const sugestao = sugestoesClientes[nomeIClips]
                      return (
                        <tr key={nomeIClips} className="border-b border-border last:border-0 hover:bg-bg-page/50">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs bg-bg-page border border-border rounded px-2 py-0.5">
                              {nomeIClips}
                            </span>
                            {sugestao && <span className="ml-2 text-xs text-primary">★</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={selClientes[nomeIClips] || ''}
                              onChange={e => setSelClientes(s => ({ ...s, [nomeIClips]: e.target.value }))}
                              className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-full max-w-[280px]"
                            >
                              <option value="">Selecionar…</option>
                              <option value="__OVERHEAD__">⚙ Overhead interno</option>
                              <option value="__IGNORAR__">✕ Ignorar este nome</option>
                              {sugestao && (
                                <option value={sugestao}>★ {sugestao}</option>
                              )}
                              <optgroup label="Clientes">
                                {clientesCanônicos
                                  .filter(c => c !== sugestao)
                                  .map(c => <option key={c} value={c}>{c}</option>)
                                }
                              </optgroup>
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              disabled={!selClientes[nomeIClips]}
                              onClick={() => {
                                const sel = selClientes[nomeIClips]
                                if (!sel) return
                                addMapeamentoCliente(nomeIClips, sel)
                                setSelClientes(s => { const n = { ...s }; delete n[nomeIClips]; return n })
                              }}
                              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Salvar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mapeamentos confirmados */}
            {mapeamentosClientes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral mb-2">Mapeamentos confirmados:</p>
                <div className="space-y-1.5">
                  {mapeamentosClientes.map(({ nomeIClips, nomeCanônico }) => (
                    <div key={nomeIClips} className="flex items-center gap-2 text-sm bg-bg-page rounded-lg px-3 py-2 border border-border">
                      <span className="font-mono text-xs text-muted min-w-[200px]">{nomeIClips}</span>
                      <span className="text-muted">→</span>
                      <span className="font-medium text-neutral flex-1">
                        {nomeCanônico === '__OVERHEAD__' ? '⚙ Overhead interno' :
                         nomeCanônico === '__IGNORAR__' ? '✕ Ignorado' : nomeCanônico}
                      </span>
                      <button
                        onClick={() => removeMapeamentoCliente(nomeIClips)}
                        title="Desfazer vínculo"
                        className="text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Seção: Equivalência de Colaboradores ── */}
        {(iClipsRel != null || iClipsRelatorio != null || mapeamentosColaboradores.length > 0 || colaboradoresIgnorados.length > 0) && (
          <section className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-1">
              <Link2 size={15} className="text-primary" />
              <h2 className="font-semibold text-neutral">Colaboradores — Equivalência de Nomes</h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Vincule nomes do iClips com os colaboradores cadastrados em Custos → Equipe.
              Feito uma vez, o vínculo é salvo permanentemente.
            </p>

            {/* Badges de resumo */}
            <div className="flex flex-wrap gap-2 mb-5 text-xs">
              {autoCount > 0 && (
                <span className="flex items-center gap-1 bg-success-bg text-success border border-success/20 rounded-lg px-3 py-1.5">
                  <CheckCircle size={11} /> {autoCount} mapeados automaticamente
                </span>
              )}
              {mapeamentosColaboradores.length > 0 && (
                <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5">
                  <Link2 size={11} /> {mapeamentosColaboradores.length} vinculados manualmente
                </span>
              )}
              {pendentes.length > 0 && (
                <span className="flex items-center gap-1 bg-warning-bg text-warning border border-warning/20 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={11} /> {pendentes.length} aguardando vínculo
                </span>
              )}
              {colaboradoresIgnorados.length > 0 && (
                <span className="flex items-center gap-1 bg-neutral/10 text-muted border border-border rounded-lg px-3 py-1.5">
                  — {colaboradoresIgnorados.length} ignorados
                </span>
              )}
              {pendentes.length === 0 && todosColabIClips.length > 0 && (
                <span className="flex items-center gap-1 bg-success-bg text-success border border-success/20 rounded-lg px-3 py-1.5">
                  <CheckCircle size={11} /> Todos os colaboradores estão mapeados
                </span>
              )}
            </div>

            {/* Tabela de pendentes */}
            {pendentes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-neutral mb-2">Aguardando vínculo manual:</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-page border-b border-border">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Nome no iClips</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Colaborador no sistema</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendentes.map(nomeIClips => {
                        const sugestao = sugestoesMap[nomeIClips]
                        const temSugestao = Boolean(sugestao)
                        return (
                          <tr key={nomeIClips} className="border-b border-border last:border-0 hover:bg-bg-page/50">
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs bg-bg-page border border-border rounded px-2 py-0.5">
                                {nomeIClips}
                              </span>
                              {temSugestao && (
                                <span className="ml-2 text-xs text-primary">★ sugestão automática</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={selecoes[nomeIClips] || ''}
                                onChange={e => setSelecoes(s => ({ ...s, [nomeIClips]: e.target.value }))}
                                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-full max-w-[260px]"
                              >
                                <option value="">Selecionar…</option>
                                <option value="__IGNORAR__">— Ignorar (ex-colaborador)</option>
                                {sugestao && (
                                  <option value={sugestao}>★ {sugestao}</option>
                                )}
                                {equipe
                                  .filter(m => m.status === 'Ativo' && m.nome !== sugestao)
                                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                                  .map(m => (
                                    <option key={m.id} value={m.nome}>{m.nome}</option>
                                  ))
                                }
                              </select>
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                disabled={!selecoes[nomeIClips]}
                                onClick={() => {
                                  const sel = selecoes[nomeIClips]
                                  if (!sel) return
                                  if (sel === '__IGNORAR__') {
                                    addIgnorado(nomeIClips)
                                  } else {
                                    addMapeamentoColaborador(nomeIClips, sel)
                                  }
                                  setSelecoes(s => { const n = { ...s }; delete n[nomeIClips]; return n })
                                }}
                                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                Confirmar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mapeamentos confirmados */}
            {mapeamentosColaboradores.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-neutral mb-2">Mapeamentos confirmados:</p>
                <div className="space-y-1.5">
                  {mapeamentosColaboradores.map(({ nomeIClips, nomeStore }) => (
                    <div key={nomeIClips} className="flex items-center gap-2 text-sm bg-bg-page rounded-lg px-3 py-2 border border-border">
                      <span className="font-mono text-xs text-muted min-w-[140px]">{nomeIClips}</span>
                      <span className="text-muted">→</span>
                      <span className="font-medium text-neutral flex-1">{nomeStore}</span>
                      <button
                        onClick={() => removeMapeamentoColaborador(nomeIClips)}
                        title="Desfazer vínculo"
                        className="text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ignorados */}
            {colaboradoresIgnorados.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral mb-2">Ignorados (ex-colaboradores / freelancers):</p>
                <div className="flex flex-wrap gap-2">
                  {colaboradoresIgnorados.map(nome => (
                    <span key={nome} className="flex items-center gap-1.5 text-xs bg-neutral/10 text-muted border border-border rounded-lg px-2.5 py-1">
                      {nome}
                      <button
                        onClick={() => removeIgnorado(nome)}
                        title="Deixar de ignorar"
                        className="hover:text-danger transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Seção 5: Dados ── */}
        <section className="bg-white rounded-xl border border-border p-5">
          <h2 className="font-semibold text-neutral mb-4">Gerenciamento de Dados</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-neutral hover:bg-bg-page transition-colors"
            >
              <Download size={14} /> Exportar dados manuais (JSON)
            </button>

            <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-neutral hover:bg-bg-page transition-colors cursor-pointer">
              <Upload size={14} /> Importar dados manuais (JSON)
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>

            <button
              onClick={handleClearData}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                clearConfirm
                  ? 'bg-danger text-white hover:bg-danger/90'
                  : 'border border-danger/40 text-danger hover:bg-danger-bg'
              }`}
            >
              <Trash2 size={14} />
              {clearConfirm ? 'Clique novamente para confirmar' : 'Limpar todos os dados'}
            </button>
            {clearConfirm && (
              <button onClick={() => setClearConfirm(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:text-neutral transition-colors">
                Cancelar
              </button>
            )}
          </div>
          <p className="text-xs text-muted mt-3">
            A exportação inclui equipe, custos fixos e variáveis cadastrados manualmente. Os dados da planilha Google não são exportados aqui.
          </p>
        </section>

      </div>
    </PageWrapper>
  )
}
