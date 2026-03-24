export interface ServiceType {
  value: string;
  label: string;
}

export interface ServiceCategory {
  label: string;
  services: ServiceType[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    label: "Saúde — Saúde Mental",
    services: [
      { value: "psicologo",         label: "Psicólogo" },
      { value: "psiquiatra",        label: "Psiquiatra" },
      { value: "psicoterapeuta",    label: "Psicoterapeuta" },
      { value: "neuropsicólogo",    label: "Neuropsicólogo" },
    ],
  },
  {
    label: "Saúde — Especialidades Médicas",
    services: [
      { value: "clinico_geral",         label: "Clínico Geral" },
      { value: "cardiologista",         label: "Cardiologista" },
      { value: "dermatologista",        label: "Dermatologista" },
      { value: "endocrinologista",      label: "Endocrinologista" },
      { value: "ginecologista",         label: "Ginecologista / Obstetra" },
      { value: "neurologista",          label: "Neurologista" },
      { value: "oftalmologista",        label: "Oftalmologista" },
      { value: "ortopedista",           label: "Ortopedista" },
      { value: "otorrino",              label: "Otorrinolaringologista" },
      { value: "pediatra",              label: "Pediatra" },
      { value: "traumatologista",       label: "Traumatologista" },
      { value: "urologista",            label: "Urologista" },
      { value: "reumatologista",        label: "Reumatologista" },
      { value: "gastroenterologista",   label: "Gastroenterologista" },
      { value: "pneumologista",         label: "Pneumologista" },
    ],
  },
  {
    label: "Saúde — Outros Profissionais",
    services: [
      { value: "dentista",          label: "Dentista" },
      { value: "fisioterapeuta",    label: "Fisioterapeuta" },
      { value: "fonoaudiologo",     label: "Fonoaudiólogo" },
      { value: "nutricionista",     label: "Nutricionista" },
      { value: "enfermeiro",        label: "Enfermeiro / Técnico de Enfermagem" },
      { value: "cuidador_idosos",   label: "Cuidador de Idosos" },
    ],
  },
  {
    label: "Jurídico",
    services: [
      { value: "adv_trabalhista",   label: "Advogado Trabalhista" },
      { value: "adv_criminal",      label: "Advogado Criminal / Penalista" },
      { value: "adv_civil",         label: "Advogado Cível" },
      { value: "adv_familia",       label: "Advogado de Família e Sucessões" },
      { value: "adv_empresarial",   label: "Advogado Empresarial" },
      { value: "adv_tributario",    label: "Advogado Tributário / Fiscal" },
      { value: "adv_imobiliario",   label: "Advogado Imobiliário" },
      { value: "adv_previdenciario",label: "Advogado Previdenciário" },
    ],
  },
  {
    label: "Casa e Manutenção",
    services: [
      { value: "faxineira",         label: "Faxineira / Diarista" },
      { value: "pedreiro",          label: "Pedreiro / Servente" },
      { value: "eletricista",       label: "Eletricista" },
      { value: "encanador",         label: "Encanador / Hidráulico" },
      { value: "pintor",            label: "Pintor" },
      { value: "marceneiro",        label: "Marceneiro / Carpinteiro" },
      { value: "serralheiro",       label: "Serralheiro" },
      { value: "gesseiro",          label: "Gesseiro" },
      { value: "ar_condicionado",   label: "Técnico de Ar Condicionado" },
      { value: "jardineiro",        label: "Jardineiro / Paisagista" },
      { value: "dedetizador",       label: "Dedetizador / Controle de Pragas" },
      { value: "chaveiro",          label: "Chaveiro" },
      { value: "vidraceiro",        label: "Vidraceiro" },
      { value: "informatica",       label: "Técnico de Informática" },
    ],
  },
  {
    label: "Finanças e Negócios",
    services: [
      { value: "contador",          label: "Contador / Contabilidade" },
      { value: "consultor_financeiro", label: "Consultor Financeiro" },
      { value: "administrador",     label: "Administrador de Empresas" },
      { value: "coach",             label: "Coach de Carreira / Negócios" },
    ],
  },
  {
    label: "Beleza e Bem-estar",
    services: [
      { value: "personal_trainer",  label: "Personal Trainer" },
      { value: "cabeleireiro",      label: "Cabeleireiro / Barbeiro" },
      { value: "esteticista",       label: "Esteticista" },
      { value: "massoterapeuta",    label: "Massoterapeuta" },
      { value: "manicure",          label: "Manicure / Pedicure" },
    ],
  },
  {
    label: "Educação",
    services: [
      { value: "professor_particular", label: "Professor Particular" },
      { value: "instrutor_idiomas",    label: "Instrutor de Idiomas" },
      { value: "tutor_concursos",      label: "Tutor para Concursos" },
    ],
  },
  {
    label: "Transporte e Logística",
    services: [
      { value: "frete",             label: "Frete / Transporte de Mudança" },
      { value: "frete_pequeno",     label: "Frete de Pequenas Cargas" },
      { value: "motorista",         label: "Motorista Particular" },
      { value: "mototaxi",          label: "Mototáxi / Motoboy" },
    ],
  },
  {
    label: "Outros",
    services: [
      { value: "fotografo",         label: "Fotógrafo / Videógrafo" },
      { value: "baba",              label: "Babá / Cuidador de Crianças" },
      { value: "chef",              label: "Chef / Cozinheiro Particular" },
      { value: "seguranca",         label: "Segurança Particular" },
      { value: "outros",            label: "Outro serviço" },
    ],
  },
];

// Mapa flat para lookup por value
export const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_CATEGORIES.flatMap(c => c.services.map(s => [s.value, s.label]))
);

// Lista flat para uso em selects simples
export const ALL_SERVICES: ServiceType[] = SERVICE_CATEGORIES.flatMap(c => c.services);
