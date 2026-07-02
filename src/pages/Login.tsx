import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useConfigStore } from '@/stores/configStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const login = useAuthStore((s) => s.login)
  const senhaCorreta = useConfigStore((s) => s.senha)
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const ok = login(senha, senhaCorreta)
    if (ok) {
      navigate('/dashboard')
    } else {
      setErro('Senha incorreta.')
      setSenha('')
    }
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Ag<span className="text-primary">110</span>
          </h1>
          <p className="text-sm text-muted mt-1">Painel de Gestão</p>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 mb-6">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="Senha"
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                error={erro}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                className="absolute right-3 top-8 text-neutral-400 hover:text-neutral-600"
              >
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
