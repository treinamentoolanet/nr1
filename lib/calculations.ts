import { Printer, Filament, ProductPart, UserSettings, PricingResult, SimulatorResult } from './types';

const DESGASTE_MAP: Record<string, number> = {
  basico: 0.10,
  medio: 0.20,
  profissional: 0.30,
};

export function calcularPrecificacao(
  printer: Printer,
  filament: Filament,
  parts: ProductPart[],
  settings: UserSettings
): PricingResult {
  const tempo_impressao = parts.reduce((sum, p) => sum + p.tempo_impressao, 0);
  const peso_estimado = parts.reduce((sum, p) => sum + p.peso_estimado, 0);
  const percentual_acabamento = parts.reduce((sum, p) => sum + p.percentual_acabamento, 0);

  const desgaste = DESGASTE_MAP[printer.nivel_uso] ?? 0.45;

  const uso_anual = printer.tempo_retorno * printer.horas_dia * printer.dias_mes;
  const valor_hora = printer.valor_maquina / uso_anual;
  const hr_ano = printer.horas_dia * printer.dias_mes * 12;
  const custo_por_grama = filament.custo / (filament.peso_kg * 1000);

  const custo_material = custo_por_grama * peso_estimado;
  const custo_energia = tempo_impressao * printer.potencia_kw * settings.tarifa_kwh;
  const custo_manutencao = ((printer.valor_maquina * desgaste) / hr_ano) * tempo_impressao;
  const custo_falhas = custo_material * printer.percentual_falhas;
  const custo_acabamento = custo_material * percentual_acabamento;
  const retorno_investimento = valor_hora * tempo_impressao;
  const depreciacao = uso_anual / settings.depreciacao_global;

  const custos_totais =
    custo_material +
    custo_energia +
    custo_manutencao +
    custo_falhas +
    custo_acabamento +
    retorno_investimento +
    depreciacao;

  const preco_atacado = custos_totais * settings.multiplicador_atacado;
  const preco_varejo = custos_totais * settings.multiplicador_varejo;

  const margem_atacado = ((preco_atacado - custos_totais) / preco_atacado) * 100;
  const margem_varejo = ((preco_varejo - custos_totais) / preco_varejo) * 100;

  return {
    custo_material,
    custo_energia,
    custo_manutencao,
    custo_falhas,
    custo_acabamento,
    retorno_investimento,
    depreciacao,
    custos_totais,
    preco_atacado,
    preco_varejo,
    margem_atacado,
    margem_varejo,
  };
}

export interface SimulatorParams {
  preco_base: number;
  quantidade: number;
  desconto_percentual: number;
  imposto_percentual: number;
  taxa_marketplace: number;
  tarifa_fixa_marketplace: number;
  custos_totais: number;
}

export function calcularSimulador(params: SimulatorParams): SimulatorResult {
  const {
    preco_base,
    quantidade,
    desconto_percentual,
    imposto_percentual,
    taxa_marketplace,
    tarifa_fixa_marketplace,
    custos_totais,
  } = params;

  const preco_com_desconto = preco_base * (1 - desconto_percentual / 100);
  const subtotal = preco_com_desconto * quantidade;
  const impostos = subtotal * (imposto_percentual / 100);
  const taxa_marketplace_valor = subtotal * (taxa_marketplace / 100);
  const total_final = subtotal + impostos;
  const custo_total_producao = custos_totais * quantidade;
  const lucro_bruto = subtotal - custo_total_producao;
  const lucro_liquido = lucro_bruto - impostos - taxa_marketplace_valor - tarifa_fixa_marketplace;
  const margem_liquida = subtotal > 0 ? (lucro_liquido / subtotal) * 100 : 0;

  return {
    preco_unitario: preco_base,
    preco_com_desconto,
    subtotal,
    impostos,
    taxa_marketplace_valor,
    total_final,
    custo_total_producao,
    lucro_bruto,
    lucro_liquido,
    margem_liquida,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
