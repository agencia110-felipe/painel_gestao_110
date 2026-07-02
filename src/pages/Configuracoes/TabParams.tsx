import { useState } from 'react'
import { useConfigStore } from '@/stores/configStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import { Save } from 'lucide-react'

export function TabParams() {
  const config = useConfigStore()
  const [aproveitamento, setAproveitamento] = useState(
    String(Math.round(config.aproveitamentoPct * 100))
  )
  const [margem, setMargem] = useState(String(Math.round(config.margemDesejadaPct * 100)))
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId)
  const [sheetsApiKey, setSheetsApiKey] = useState(config.sheetsApiKey)
  const [senha, setSenha] = useState(config.senha)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const aprovPct = Math.min(1, Math.max(0, Number(aproveitamento) / 100))
    const margPct = Math.min(1, Math.max(0, Number(margem) / 100))
    config.setAproveitamento(aprovPct)
    config.setMargemDesejada(margPct)
    config.setSpreadsheetId(spreadsheetId.trim())
    config.setSheetsApiKey(sheetsApiKey.trim())
    if (senha.trim()) config.setSenha(senha.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardTitle>Parâmetros de Cálculo</CardTitle>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <Input
              label="Aproveitamento (%)"
              type="number"
              min={1}
              max={100}
              value={aproveitamento}
              onChange={(e) => setAproveitamento(e.target.value)}
              className="w-32"
            />
            <p className="text-sm text-muted pb-2">
              Percentual das horas contratadas que são produtivas
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Input
              label="Margem desejada (%)"
              type="number"
              min={0}
              max={100}
              value={margem}
              onChange={(e) => setMargem(e.target.value)}
              className="w-32"
            />
            <p className="text-sm text-muted pb-2">
              Meta de margem líquida por cliente
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Google Sheets</CardTitle>
        <div className="space-y-4">
          <Input
            label="Spreadsheet ID"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="1abc..."
            className="font-mono text-xs"
          />
          <Input
            label="API Key"
            value={sheetsApiKey}
            onChange={(e) => setSheetsApiKey(e.target.value)}
            placeholder="AIza..."
            className="font-mono text-xs"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Segurança</CardTitle>
        <Input
          label="Nova senha de acesso"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Deixe em branco para não alterar"
        />
      </Card>

      <Button onClick={handleSave} size="lg">
        <Save size={16} />
        {saved ? 'Salvo!' : 'Salvar Configurações'}
      </Button>
    </div>
  )
}
