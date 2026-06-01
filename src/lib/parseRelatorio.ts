// ---------------------------------------------------------------------------
// MAPA DE CLIENTES iClips → nome canônico do painel
//
// Como descobrir nomes não mapeados:
//   Abra Configurações → seção "Dados de Tarefas (iClips)"
//   Clientes não reconhecidos aparecem no alerta em amarelo.
//   Adicione-os abaixo e faça o vínculo na tela de Configurações.
// ---------------------------------------------------------------------------

export const MAPA_CLIENTES_RELATORIO: Record<string, string> = {
  // ── Servopa ───────────────────────────────────────────────────────────────
  'Servopa':              'Servopa',
  'Servopa Sign':         'Servopa',
  'Servopa Seminovos':    'Servopa',
  'Servopa Caminhões':    'Servopa',
  'Servopa Caminhoes':    'Servopa',
  'Honda Servopa':        'Servopa',
  'Servopa Geral':        'Servopa',

  // ── Bom Jesus ─────────────────────────────────────────────────────────────
  'Bom Jesus':                              'Bom Jesus',
  'Bom Jesus Aldeia':                       'Bom Jesus',
  'Bom Jesus Centro':                       'Bom Jesus',
  'Bom Jesus São José':                     'Bom Jesus',
  'Bom Jesus Sao Jose':                     'Bom Jesus',
  'Bom Jesus Nossa Senhora de Lourdes':     'Bom Jesus',
  'Bom Jesus Nossa Senhora do Rosário':     'Bom Jesus',
  'Bom Jesus Nossa Senhora do Rosario':     'Bom Jesus',
  'Bom Jesus Seminário':                    'Bom Jesus',
  'Bom Jesus Seminario':                    'Bom Jesus',
  'Bom Jesus Aurora':                       'Bom Jesus',
  'Bom Jesus Coração de Jesus':             'Bom Jesus',
  'Bom Jesus Coracao de Jesus':             'Bom Jesus',

  // ── Honda ─────────────────────────────────────────────────────────────────
  'Honda Motocar':        'Honda Motocar',
  'Honda Blokton':        'Honda Motocar',

  // ── FPP ───────────────────────────────────────────────────────────────────
  'FPP':                              'FPP',
  'Faculdades Pequeno Príncipe':      'FPP',
  'Faculdades Pequeno Principe':      'FPP',

  // ── Overhead interno ──────────────────────────────────────────────────────
  'Processos':            '__OVERHEAD__',
  'Agência 110':          '__OVERHEAD__',
  'Agencia 110':          '__OVERHEAD__',
  'AG 110':               '__OVERHEAD__',

  // ── Demais clientes ───────────────────────────────────────────────────────
  'Virage':               'Virage',

  'Realiza':              'Realiza',
  'Realiza Arquitetura':  'Realiza',

  'Panorâmico':           'Panorâmico',
  'Panoramico':           'Panorâmico',

  'A.Gonçalves':          'A.Gonçalves',
  'A.Gonçalves Imóveis':  'A.Gonçalves',
  'A.Goncalves':          'A.Gonçalves',
  'A.Goncalves Imoveis':  'A.Gonçalves',

  'ANJUSS':               'ANJUSS',

  'J17 BANK':             'J17 BANK',

  'Hospital Paranaguá':   'Hospital Paranaguá',
  'HOSPITAL PARANAGUA':   'Hospital Paranaguá',
  'Hospital Paranagua':   'Hospital Paranaguá',

  'Soluagro':             'Soluagro',

  'ACE':                  'ACE',
  'Ace Revestimentos':    'ACE',
}

export function mapearCliente(
  nomeRelatorio: string,
  mapeamentoCustom: Record<string, string> = {}
): string {
  const nome = nomeRelatorio?.trim()
  if (!nome) return '__NAO_MAPEADO__'
  return mapeamentoCustom[nome]
    ?? MAPA_CLIENTES_RELATORIO[nome]
    ?? '__NAO_MAPEADO__'
}
