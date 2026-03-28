export interface Plan {
  slug: string;
  modo: string;
  plano: string;
  priceLabel: string;
  priceAmount: number; // em centavos
  features: string[];
  stripeName: string;
}

export const PLANS: Record<string, Plan> = {
  'professor-start': {
    slug: 'professor-start',
    modo: 'Kadosh Professor',
    plano: 'Start',
    priceLabel: 'R$97/mês',
    priceAmount: 9700,
    features: ['Professor particular de IA', '1 língua estrangeira', '1 concurso público'],
    stripeName: 'Kadosh Professor Start',
  },
  'professor-pro': {
    slug: 'professor-pro',
    modo: 'Kadosh Professor',
    plano: 'Pro',
    priceLabel: 'R$197/mês',
    priceAmount: 19700,
    features: ['Professor particular de IA', '2 línguas estrangeiras', '2 concursos públicos'],
    stripeName: 'Kadosh Professor Pro',
  },
  'professor-scale': {
    slug: 'professor-scale',
    modo: 'Kadosh Professor',
    plano: 'Scale',
    priceLabel: 'R$497/mês',
    priceAmount: 49700,
    features: ['Professor particular de IA', 'Línguas ilimitadas', 'Concursos públicos ilimitados'],
    stripeName: 'Kadosh Professor Scale',
  },
  'vendedor-starter': {
    slug: 'vendedor-starter',
    modo: 'Kadosh Vendedor',
    plano: 'Starter',
    priceLabel: 'R$97/mês',
    priceAmount: 9700,
    features: ['1 produto cadastrado', 'Até 500 conversas por mês'],
    stripeName: 'Kadosh Vendedor Starter',
  },
  'vendedor-pro': {
    slug: 'vendedor-pro',
    modo: 'Kadosh Vendedor',
    plano: 'Pro',
    priceLabel: 'R$197/mês',
    priceAmount: 19700,
    features: ['Produtos ilimitados', 'Até 3.000 conversas por mês'],
    stripeName: 'Kadosh Vendedor Pro',
  },
  'vendedor-scale': {
    slug: 'vendedor-scale',
    modo: 'Kadosh Vendedor',
    plano: 'Scale',
    priceLabel: 'R$397/mês',
    priceAmount: 39700,
    features: ['Produtos ilimitados', 'Conversas ilimitadas', 'Sem restrições'],
    stripeName: 'Kadosh Vendedor Scale',
  },
  'secretaria-pro': {
    slug: 'secretaria-pro',
    modo: 'Kadosh Secretária',
    plano: 'Pro',
    priceLabel: 'R$297/mês',
    priceAmount: 29700,
    features: ['Até 200 agendamentos por mês', 'Avisos automáticos no WhatsApp', 'Resumo pré-consulta incluído'],
    stripeName: 'Kadosh Secretária Pro',
  },
  'secretaria-scale': {
    slug: 'secretaria-scale',
    modo: 'Kadosh Secretária',
    plano: 'Scale',
    priceLabel: 'R$497/mês',
    priceAmount: 49700,
    features: ['Agendamentos ilimitados', 'Avisos automáticos no WhatsApp', 'Resumo pré-consulta incluído', 'Tudo ilimitado'],
    stripeName: 'Kadosh Secretária Scale',
  },
  'expert': {
    slug: 'expert',
    modo: 'Kadosh Expert',
    plano: 'Expert',
    priceLabel: 'R$899/mês',
    priceAmount: 89900,
    features: ['Criação de qualquer sistema ou aplicação', 'Automações ilimitadas', 'Suporte dedicado', 'Acesso completo sem restrições'],
    stripeName: 'Kadosh Expert',
  },
};
