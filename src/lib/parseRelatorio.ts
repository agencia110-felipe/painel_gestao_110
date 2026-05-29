// ---------------------------------------------------------------------------
// MAPA DE CLIENTES iClips → nome canônico do painel
//
// Como descobrir nomes não mapeados:
//   Abra Configurações → seção "Dados de Tarefas (iClips)"
//   Clientes não reconhecidos aparecem no alerta em amarelo.
//   Adicione-os abaixo e faça o vínculo na tela de Configurações.
// ---------------------------------------------------------------------------

export const MAPA_CLIENTES_RELATORIO: Record<string, string> = {
  // Servopa — sub-clientes agrupam no cliente pai
  'Servopa':            'Servopa',
  'Servopa Sign':       'Servopa',
  'Servopa Seminovos':  'Servopa',
  'Servopa Caminhões':  'Servopa',
  'Honda Servopa':      'Servopa',
  'Servopa Geral':      'Servopa',

  // Bom Jesus — unidades agrupam no cliente pai
  'Bom Jesus':                          'Bom Jesus',
  'Bom Jesus Aldeia':                   'Bom Jesus',
  'Bom Jesus Centro':                   'Bom Jesus',
  'Bom Jesus São José':                 'Bom Jesus',
  'Bom Jesus Nossa Senhora de Lourdes': 'Bom Jesus',
  'Bom Jesus Nossa Senhora do Rosário': 'Bom Jesus',
  'Bom Jesus Seminário':                'Bom Jesus',
  'Bom Jesus Aurora':                   'Bom Jesus',
  'Bom Jesus Coração de Jesus':         'Bom Jesus',

  // Honda
  'Honda Motocar': 'Honda Motocar',
  'Honda Blokton': 'Honda Motocar',

  // FPP
  'Faculdades Pequeno Príncipe': 'FPP',
  'FPP': 'FPP',

  // Overhead interno — não é cliente, vai para rateio
  'Processos':   '__OVERHEAD__',
  'Agência 110': '__OVERHEAD__',
  'Agencia 110': '__OVERHEAD__',

  // Demais clientes
  'Virage':              'Virage',
  'Realiza Arquitetura': 'Realiza',
  'Panorâmico':          'Panorâmico',
  'A.Gonçalves Imóveis': 'A.Gonçalves',
  'ANJUSS':              'ANJUSS',
  'J17 BANK':            'J17 BANK',
  'HOSPITAL PARANAGUA':  'Hospital Paranaguá',
  'Soluagro':            'Soluagro',
  'Ace Revestimentos':   'ACE',
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
