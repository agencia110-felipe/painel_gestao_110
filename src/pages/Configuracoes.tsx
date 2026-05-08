import { useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Download, Upload, Trash2, Database } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useConfigStore } from '@/store/useConfigStore'
import { useCustosStore } from '@/store/useCustosStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import { procfyApi, type ProcfyStatus } from '@/lib/api'
import type { ConfigParams } from '@/types'

export function Configuracoes() {
  const { params, pacotes, sheets, procfyAutoSync, setParam, resetParams, updatePacote, setSheetsConfig, setProcfyAutoSync } = useConfigStore()
  const { equipe, fixos, variaveis, addMembro, addFixo, addVariavel, removeMembro, removeFixo, removeVariavel, hasProcfy, procfyLastSync, procfyLoading, procfyError, syncFromProcfy } = useCustosStore()
  const { clientes, lastSync, error } = useSheetsStore()

  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  // ── Procfy test ──
  const [procfyTestStatus, setProcfyTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [procfyTestMsg, setProcfyTestMsg] = useState('')

  async function handleTestProcfy() {
    setProcfyTestStatus('loading')
    setProcfyTestMsg('')
    try {
      const s: ProcfyStatus = await procfyApi.status()
      if (!s.configured) {
        setProcfyTestStatus('error')
        setProcfyTestMsg('API Key não configurada no servidor (server/.env → PROCFY_API_KEY).')
      } else if (s.ok) {
        setProcfyTestStatus('ok')
        setProcfyTestMsg('Conectado ao Procfy com sucesso.')
      } else {
        setProcfyTestStatus('error')
        setProcfyTestMsg(s.error ?? `Procfy retornou HTTP ${s.httpStatus ?? '?'}.`)
      }
    } catch (e) {
      setProcfyTestStatus('error')
      setProcfyTestMsg(e instanceof Error ? e.message : 'Erro ao testar conexão.')
    }
  }

  async function handleSyncProcfy() {
    await syncFromProcfy()
  }

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
              <label className="text-xs text-muted mb-1 block">Spreadsheet ID</label>
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

        {/* ── Seção 2: Procfy ── */}
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-primary" />
            <h2 className="font-semibold text-neutral">Integração Procfy</h2>
          </div>

          <div className="bg-bg-page rounded-lg px-4 py-3 mb-4 text-xs text-muted border border-border">
            A API Key do Procfy fica em <code className="font-mono bg-neutral/10 px-1 rounded">server/.env → PROCFY_API_KEY</code> e não é exposta nesta tela por segurança. Após adicionar a chave, reinicie o servidor e clique em "Testar conexão".
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="bg-bg-page rounded-lg px-4 py-3">
              <p className="text-xs text-muted mb-0.5">Status</p>
              <p className={`font-medium ${hasProcfy ? 'text-success' : 'text-muted'}`}>
                {hasProcfy ? 'Sincronizado' : 'Não sincronizado'}
              </p>
            </div>
            <div className="bg-bg-page rounded-lg px-4 py-3">
              <p className="text-xs text-muted mb-0.5">Última sincronização</p>
              <p className="font-medium text-neutral">
                {procfyLastSync ? new Date(procfyLastSync).toLocaleString('pt-BR') : '—'}
              </p>
            </div>
          </div>

          {/* Auto-sync toggle */}
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer select-none">
              <div
                onClick={() => setProcfyAutoSync(!procfyAutoSync)}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${procfyAutoSync ? 'bg-primary' : 'bg-neutral/20'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform shadow ${procfyAutoSync ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              Sincronizar automaticamente ao abrir o painel
            </label>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button
              onClick={handleTestProcfy}
              disabled={procfyTestStatus === 'loading'}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-neutral hover:bg-bg-page transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={procfyTestStatus === 'loading' ? 'animate-spin' : ''} />
              {procfyTestStatus === 'loading' ? 'Testando...' : 'Testar conexão'}
            </button>

            <button
              onClick={handleSyncProcfy}
              disabled={procfyLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={procfyLoading ? 'animate-spin' : ''} />
              {procfyLoading ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          </div>

          {/* Test result */}
          {procfyTestStatus !== 'idle' && procfyTestStatus !== 'loading' && (
            <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border ${
              procfyTestStatus === 'ok'
                ? 'bg-success-bg border-success/30 text-success'
                : 'bg-danger-bg border-danger/30 text-danger'
            }`}>
              {procfyTestStatus === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {procfyTestMsg}
            </div>
          )}

          {/* Sync error */}
          {procfyError && (
            <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border bg-danger-bg border-danger/30 text-danger mt-2">
              <XCircle size={14} />
              {procfyError}
            </div>
          )}
        </section>

        {/* ── Seção 3: Parâmetros Operacionais ── */}
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

        {/* ── Seção 4: Pacotes Base ── */}
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
