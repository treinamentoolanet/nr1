export type NivelUso = 'basico' | 'medio' | 'profissional';

export interface Printer {
  id: string;
  user_id: string;
  nome: string;
  marca: string | null;
  valor_maquina: number;
  tempo_retorno: number;
  horas_dia: number;
  dias_mes: number;
  potencia_kw: number;
  nivel_uso: NivelUso;
  percentual_falhas: number;
  created_at: string;
  updated_at: string;
}

export interface Filament {
  id: string;
  user_id: string;
  marca: string;
  descricao: string | null;
  peso_kg: number;
  custo: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  printer_id: string | null;
  filament_id: string | null;
  created_at: string;
  updated_at: string;
  printers?: Printer;
  filaments?: Filament;
  product_parts?: ProductPart[];
}

export interface ProductPart {
  id: string;
  product_id: string;
  nome: string;
  tempo_impressao: number;
  peso_estimado: number;
  percentual_acabamento: number;
  created_at: string;
  updated_at: string;
}

export interface Marketplace {
  id: string;
  user_id: string;
  nome: string;
  taxa: number;
  tarifa_fixa: number;
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: string;
  product_id: string;
  nome: string;
  preco: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  tarifa_kwh: number;
  depreciacao_global: number;
  multiplicador_atacado: number;
  multiplicador_varejo: number;
  practical_mode_completed: boolean;
  practical_mode_step: number;
  empresa_nome: string;
  empresa_cnpj: string;
  empresa_contato: string;
  empresa_endereco: string;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  numero: string;
  cliente_nome: string;
  produto_nome: string;
  produto_id: string | null;
  printer_nome: string;
  filament_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  imposto_percentual: number;
  taxa_marketplace: number;
  tarifa_fixa_marketplace: number;
  marketplace_nome: string;
  price_mode: 'varejo' | 'atacado';
  custos_totais: number;
  subtotal: number;
  impostos: number;
  taxa_marketplace_valor: number;
  lucro_liquido: number;
  margem_liquida: number;
  total_final: number;
  observacoes: string;
  validade_dias: number;
  status: 'pendente' | 'aceito' | 'recusado';
  created_at: string;
  updated_at: string;
}

export interface PricingResult {
  custo_material: number;
  custo_energia: number;
  custo_manutencao: number;
  custo_falhas: number;
  custo_acabamento: number;
  retorno_investimento: number;
  depreciacao: number;
  custos_totais: number;
  preco_atacado: number;
  preco_varejo: number;
  margem_atacado: number;
  margem_varejo: number;
}

export interface SimulatorResult {
  preco_unitario: number;
  preco_com_desconto: number;
  subtotal: number;
  impostos: number;
  taxa_marketplace_valor: number;
  total_final: number;
  custo_total_producao: number;
  lucro_bruto: number;
  lucro_liquido: number;
  margem_liquida: number;
}
