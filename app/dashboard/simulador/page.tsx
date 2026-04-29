'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Printer, Filament, ProductPart, UserSettings, Marketplace } from '@/lib/types';
import { calcularPrecificacao, calcularSimulador, formatCurrency, SimulatorParams } from '@/lib/calculations';
import { TrendingUp, Loader as Loader2, CircleAlert as AlertCircle, DollarSign, Tag, ShoppingCart, TrendingDown, ChartBar as BarChart3 } from 'lucide-react';

export default function SimuladorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState('');
  const [priceMode, setPriceMode] = useState<'varejo' | 'atacado'>('varejo');
  const [quantidade, setQuantidade] = useState('1');
  const [desconto, setDesconto] = useState('0');
  const [imposto, setImposto] = useState('0');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReturnType<typeof calcularSimulador> | null>(null);
  const [pricing, setPricing] = useState<ReturnType<typeof calcularPrecificacao> | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prods, mkts, sett] = await Promise.all([
        supabase.from('products').select('*, printers(*), filaments(*), product_parts(*)').eq('user_id', user.id).order('nome'),
        supabase.from('marketplaces').select('*').eq('user_id', user.id).order('nome'),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      setProducts(prods.data ?? []);
      setMarketplaces(mkts.data ?? []);
      if (sett.data) setSettings(sett.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  function handleSimulate() {
    setError('');
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) { setError('Selecione um produto.'); return; }
    if (!settings) { setError('Configure as definicoes nas Configuracoes.'); return; }

    const printer = (product as any).printers as Printer | null;
    const filament = (product as any).filaments as Filament | null;
    const parts = (product.product_parts ?? []) as ProductPart[];

    if (!printer || !filament || parts.length === 0) {
      setError('Produto incompleto. Verifique impressora, filamento e pecas.');
      return;
    }

    const pricingResult = calcularPrecificacao(printer, filament, parts, settings);
    setPricing(pricingResult);

    const marketplace = marketplaces.find((m) => m.id === selectedMarketplaceId);
    const preco_base = priceMode === 'varejo' ? pricingResult.preco_varejo : pricingResult.preco_atacado;

    const params: SimulatorParams = {
      preco_base,
      quantidade: parseInt(quantidade) || 1,
      desconto_percentual: parseFloat(desconto) || 0,
      imposto_percentual: parseFloat(imposto) || 0,
      taxa_marketplace: marketplace?.taxa ?? 0,
      tarifa_fixa_marketplace: marketplace?.tarifa_fixa ?? 0,
      custos_totais: pricingResult.custos_totais,
    };

    setResult(calcularSimulador(params));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Simulador de Vendas</h1>
        <p className="text-muted-foreground mt-1">Simule cenarios de venda e calcule sua lucratividade</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-foreground">Parametros da Simulacao</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Produto *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => { setSelectedProductId(e.target.value); setResult(null); }}
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                >
                  <option value="">Selecionar...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tipo de Preco</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['varejo', 'atacado'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPriceMode(mode)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        priceMode === mode
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Marketplace</label>
                <select
                  value={selectedMarketplaceId}
                  onChange={(e) => setSelectedMarketplaceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                >
                  <option value="">Nenhum / Venda direta</option>
                  {marketplaces.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.taxa}%)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Desconto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Imposto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={imposto}
                  onChange={(e) => setImposto(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleSimulate}
                disabled={!selectedProductId}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Simular
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {!result ? (
              <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Aguardando simulacao</h3>
                <p className="text-muted-foreground text-sm">Configure os parametros e clique em Simular.</p>
              </div>
            ) : (
              <>
                {/* Pricing base */}
                {pricing && (
                  <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-foreground mb-3">Preco base</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-muted/40 rounded-xl p-4 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Custo unitario</div>
                        <div className="text-xl font-bold text-foreground">{formatCurrency(pricing.custos_totais)}</div>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-xl p-4 text-center">
                        <div className="text-xs text-blue-600 mb-1">Preco {priceMode}</div>
                        <div className="text-xl font-bold text-blue-700">{formatCurrency(result.preco_unitario)}</div>
                      </div>
                      {parseFloat(desconto) > 0 && (
                        <div className="flex-1 bg-orange-50 rounded-xl p-4 text-center">
                          <div className="text-xs text-orange-600 mb-1">Com desconto</div>
                          <div className="text-xl font-bold text-orange-700">{formatCurrency(result.preco_com_desconto)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Breakdown */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground mb-4">Detalhamento ({parseInt(quantidade)} unidade(s))</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Subtotal (receita bruta)', value: result.subtotal, positive: true, bold: false },
                      { label: 'Custo de producao', value: -result.custo_total_producao, positive: false, bold: false },
                      { label: 'Lucro bruto', value: result.lucro_bruto, positive: result.lucro_bruto >= 0, bold: true },
                      { label: `Impostos (${imposto}%)`, value: -result.impostos, positive: false, bold: false },
                      { label: 'Taxas de marketplace', value: -(result.taxa_marketplace_valor + (marketplaces.find(m => m.id === selectedMarketplaceId)?.tarifa_fixa ?? 0)), positive: false, bold: false },
                      { label: 'Lucro liquido', value: result.lucro_liquido, positive: result.lucro_liquido >= 0, bold: true },
                    ].map((row, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${row.bold ? 'bg-muted/50 border border-border' : ''}`}>
                        <span className={`text-sm ${row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{row.label}</span>
                        <span className={`text-sm font-semibold ${
                          row.bold
                            ? row.positive ? 'text-green-600' : 'text-red-600'
                            : row.value >= 0 ? 'text-foreground' : 'text-red-500'
                        }`}>
                          {row.value >= 0 ? '' : ''}{formatCurrency(Math.abs(row.value))}
                          {row.value < 0 && <span className="ml-0.5 text-xs opacity-70">(-)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Margin */}
                <div className={`rounded-xl border p-5 shadow-sm ${result.margem_liquida >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.margem_liquida >= 0
                        ? <TrendingUp className="w-6 h-6 text-green-600" />
                        : <TrendingDown className="w-6 h-6 text-red-600" />
                      }
                      <div>
                        <div className={`font-semibold ${result.margem_liquida >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                          Margem Liquida
                        </div>
                        <div className={`text-xs ${result.margem_liquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.margem_liquida >= 0 ? 'Operacao lucrativa' : 'Operacao com prejuizo'}
                        </div>
                      </div>
                    </div>
                    <div className={`text-4xl font-bold ${result.margem_liquida >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {result.margem_liquida.toFixed(1)}%
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.margem_liquida >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(result.margem_liquida), 100)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
