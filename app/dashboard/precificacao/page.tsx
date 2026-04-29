'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Printer, Filament, ProductPart, UserSettings, PricingResult } from '@/lib/types';
import { calcularPrecificacao, formatCurrency } from '@/lib/calculations';
import { Calculator, Loader as Loader2, ChevronDown, CircleAlert as AlertCircle, TrendingUp, Zap, Wrench, Package, Scissors, RotateCcw, ArrowDown, DollarSign } from 'lucide-react';

export default function PrecificacaoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prods, sett] = await Promise.all([
        supabase
          .from('products')
          .select('*, printers(*), filaments(*), product_parts(*)')
          .eq('user_id', user.id)
          .order('nome'),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      setProducts(prods.data ?? []);
      if (sett.data) setSettings(sett.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleCalculate() {
    if (!selectedProductId) return;
    setCalculating(true);
    setError('');

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    setSelectedProduct(product);

    const printer = (product as any).printers as Printer | null;
    const filament = (product as any).filaments as Filament | null;
    const parts = (product.product_parts ?? []) as ProductPart[];

    if (!printer) { setError('Este produto nao tem impressora associada.'); setCalculating(false); return; }
    if (!filament) { setError('Este produto nao tem filamento associado.'); setCalculating(false); return; }
    if (parts.length === 0) { setError('Este produto nao tem pecas cadastradas.'); setCalculating(false); return; }
    if (!settings) { setError('Configure as definicoes globais nas Configuracoes.'); setCalculating(false); return; }

    const calc = calcularPrecificacao(printer, filament, parts, settings);
    setResult(calc);
    setCalculating(false);
  }

  const costItems = result ? [
    { label: 'Custo de Material', value: result.custo_material, icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Custo de Energia', value: result.custo_energia, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Custo de Manutencao', value: result.custo_manutencao, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Custo de Falhas', value: result.custo_falhas, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Custo de Acabamento', value: result.custo_acabamento, icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Retorno de Investimento', value: result.retorno_investimento, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Depreciacao', value: result.depreciacao, icon: RotateCcw, color: 'text-gray-600', bg: 'bg-gray-50' },
  ] : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Precificacao</h1>
        <p className="text-muted-foreground mt-1">Calcule o preco ideal para seus produtos</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: selector */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Selecionar Produto</h2>

              {products.length === 0 ? (
                <div className="text-center py-6">
                  <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Cadastre produtos na aba Produtos primeiro.</p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedProductId}
                    onChange={(e) => { setSelectedProductId(e.target.value); setResult(null); setError(''); }}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background mb-4"
                  >
                    <option value="">Selecionar produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>

                  {selectedProductId && (() => {
                    const p = products.find((pr) => pr.id === selectedProductId);
                    if (!p) return null;
                    const printer = (p as any).printers;
                    const filament = (p as any).filaments;
                    const parts = p.product_parts ?? [];
                    const totalTempo = parts.reduce((s, pp) => s + pp.tempo_impressao, 0);
                    const totalPeso = parts.reduce((s, pp) => s + pp.peso_estimado, 0);

                    return (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5 text-sm">
                          <span className="text-muted-foreground">Impressora</span>
                          <span className="font-medium text-foreground">{printer?.nome ?? 'Nao definida'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5 text-sm">
                          <span className="text-muted-foreground">Filamento</span>
                          <span className="font-medium text-foreground">{filament?.marca ?? 'Nao definido'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5 text-sm">
                          <span className="text-muted-foreground">Pecas</span>
                          <span className="font-medium text-foreground">{parts.length}</span>
                        </div>
                        <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5 text-sm">
                          <span className="text-muted-foreground">Tempo total</span>
                          <span className="font-medium text-foreground">{totalTempo.toFixed(2)}h</span>
                        </div>
                        <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5 text-sm">
                          <span className="text-muted-foreground">Peso total</span>
                          <span className="font-medium text-foreground">{totalPeso.toFixed(1)}g</span>
                        </div>
                      </div>
                    );
                  })()}

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600 mb-4 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleCalculate}
                    disabled={calculating || !selectedProductId}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                    {calculating ? 'Calculando...' : 'Calcular Preco'}
                  </button>
                </>
              )}
            </div>

            {settings && (
              <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                <h2 className="font-semibold text-foreground mb-3 text-sm">Configuracoes aplicadas</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarifa kWh</span>
                    <span className="font-medium">R$ {settings.tarifa_kwh}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depreciacao</span>
                    <span className="font-medium">{settings.depreciacao_global} meses</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mult. atacado</span>
                    <span className="font-medium">{settings.multiplicador_atacado}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mult. varejo</span>
                    <span className="font-medium">{settings.multiplicador_varejo}x</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: results */}
          <div className="lg:col-span-2 space-y-4">
            {!result ? (
              <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
                <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Aguardando calculo</h3>
                <p className="text-muted-foreground text-sm">Selecione um produto e clique em Calcular Preco.</p>
              </div>
            ) : (
              <>
                {/* Custos individuais */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground mb-4">Breakdown de custos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {costItems.map((item) => (
                      <div key={item.label} className={`flex items-center gap-3 p-3 ${item.bg} rounded-xl`}>
                        <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground truncate">{item.label}</div>
                          <div className={`text-sm font-semibold ${item.color}`}>{formatCurrency(item.value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total e precos */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-2 justify-center mb-4">
                    <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Aplicando multiplicadores</span>
                  </div>

                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <div className="text-sm font-semibold text-foreground">Custos Totais</div>
                      <div className="text-xl font-bold text-foreground">{formatCurrency(result.custos_totais)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">Preco Atacado</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-700 mb-2">{formatCurrency(result.preco_atacado)}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${result.margem_atacado}%` }} />
                        </div>
                        <span className="text-sm font-medium text-blue-600">{result.margem_atacado.toFixed(1)}% margem</span>
                      </div>
                    </div>

                    <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Preco Varejo</span>
                      </div>
                      <div className="text-3xl font-bold text-green-700 mb-2">{formatCurrency(result.preco_varejo)}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-green-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${result.margem_varejo}%` }} />
                        </div>
                        <span className="text-sm font-medium text-green-600">{result.margem_varejo.toFixed(1)}% margem</span>
                      </div>
                    </div>
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
