'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Printer, Filament, ProductPart, UserSettings, Marketplace, Quote } from '@/lib/types';
import { calcularPrecificacao, calcularSimulador, formatCurrency, SimulatorParams } from '@/lib/calculations';
import { printQuotePDF } from '@/lib/pdf';
import { FileText, Plus, Loader as Loader2, X, Save, CircleAlert as AlertCircle, Download, Trash2, Eye, TrendingUp, TrendingDown, User, Package, ChevronDown, ChevronUp, CircleCheck as CheckCircle2, Clock, Circle as XCircle } from 'lucide-react';

function generateQuoteNumber(index: number) {
  const year = new Date().getFullYear();
  return `ORC-${year}-${String(index).padStart(4, '0')}`;
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  aceito: { label: 'Aceito', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrcamentosPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);

  const [form, setForm] = useState({
    cliente_nome: '',
    produto_id: '',
    marketplace_id: '',
    price_mode: 'varejo' as 'varejo' | 'atacado',
    quantidade: '1',
    desconto: '0',
    imposto: '0',
    observacoes: '',
    validade_dias: '30',
  });

  // Live preview pricing
  const [pricing, setPricing] = useState<ReturnType<typeof calcularPrecificacao> | null>(null);
  const [simResult, setSimResult] = useState<ReturnType<typeof calcularSimulador> | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [quotesRes, prodsRes, mktsRes, settRes] = await Promise.all([
      supabase.from('quotes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('products').select('*, printers(*), filaments(*), product_parts(*)').eq('user_id', user.id).order('nome'),
      supabase.from('marketplaces').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setQuotes(quotesRes.data ?? []);
    setProducts(prodsRes.data ?? []);
    setMarketplaces(mktsRes.data ?? []);
    if (settRes.data) setSettings(settRes.data);
    setLoading(false);
  }

  function computePricing(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product || !settings) { setPricing(null); setSimResult(null); return; }

    const printer = (product as any).printers as Printer | null;
    const filament = (product as any).filaments as Filament | null;
    const parts = (product.product_parts ?? []) as ProductPart[];

    if (!printer || !filament || parts.length === 0) { setPricing(null); setSimResult(null); return; }

    const p = calcularPrecificacao(printer, filament, parts, settings);
    setPricing(p);
    return p;
  }

  function computeSimulation(pricingResult: ReturnType<typeof calcularPrecificacao> | null, f = form) {
    if (!pricingResult) { setSimResult(null); return; }
    const marketplace = marketplaces.find((m) => m.id === f.marketplace_id);
    const preco_base = f.price_mode === 'varejo' ? pricingResult.preco_varejo : pricingResult.preco_atacado;

    const params: SimulatorParams = {
      preco_base,
      quantidade: parseInt(f.quantidade) || 1,
      desconto_percentual: parseFloat(f.desconto) || 0,
      imposto_percentual: parseFloat(f.imposto) || 0,
      taxa_marketplace: marketplace?.taxa ?? 0,
      tarifa_fixa_marketplace: marketplace?.tarifa_fixa ?? 0,
      custos_totais: pricingResult.custos_totais,
    };

    const r = calcularSimulador(params);
    setSimResult(r);
    return r;
  }

  function handleFormChange(field: string, value: string) {
    const newForm = { ...form, [field]: value };
    setForm(newForm);

    if (field === 'produto_id') {
      const p = computePricing(value);
      computeSimulation(p ?? null, newForm);
    } else {
      computeSimulation(pricing, newForm);
    }
  }

  function openForm() {
    setForm({
      cliente_nome: '',
      produto_id: '',
      marketplace_id: '',
      price_mode: 'varejo',
      quantidade: '1',
      desconto: '0',
      imposto: '0',
      observacoes: '',
      validade_dias: '30',
    });
    setPricing(null);
    setSimResult(null);
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    setError('');
    if (!form.cliente_nome.trim()) { setError('Informe o nome do cliente.'); return; }
    if (!form.produto_id) { setError('Selecione um produto.'); return; }
    if (!pricing || !simResult) { setError('Nao foi possivel calcular o preco. Verifique o produto.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const product = products.find((p) => p.id === form.produto_id);
    const printer = (product as any)?.printers as Printer | null;
    const filament = (product as any)?.filaments as Filament | null;
    const marketplace = marketplaces.find((m) => m.id === form.marketplace_id);
    const totalQuotes = quotes.length + 1;
    const numero = generateQuoteNumber(totalQuotes);
    const preco_base = form.price_mode === 'varejo' ? pricing.preco_varejo : pricing.preco_atacado;
    const precoComDesconto = preco_base * (1 - (parseFloat(form.desconto) || 0) / 100);

    const payload = {
      user_id: user.id,
      numero,
      cliente_nome: form.cliente_nome.trim(),
      produto_nome: product?.nome ?? '',
      produto_id: form.produto_id,
      printer_nome: printer?.nome ?? '',
      filament_nome: filament?.marca ?? '',
      quantidade: parseInt(form.quantidade) || 1,
      preco_unitario: preco_base,
      desconto_percentual: parseFloat(form.desconto) || 0,
      imposto_percentual: parseFloat(form.imposto) || 0,
      taxa_marketplace: marketplace?.taxa ?? 0,
      tarifa_fixa_marketplace: marketplace?.tarifa_fixa ?? 0,
      marketplace_nome: marketplace?.nome ?? '',
      price_mode: form.price_mode,
      custos_totais: pricing.custos_totais,
      subtotal: simResult.subtotal,
      impostos: simResult.impostos,
      taxa_marketplace_valor: simResult.taxa_marketplace_valor,
      lucro_liquido: simResult.lucro_liquido,
      margem_liquida: simResult.margem_liquida,
      total_final: simResult.total_final,
      observacoes: form.observacoes,
      validade_dias: parseInt(form.validade_dias) || 30,
      status: 'pendente',
    };

    const { data: newQuote } = await supabase.from('quotes').insert(payload).select().single();

    setSaving(false);
    setShowForm(false);
    await fetchAll();

    if (newQuote && settings) {
      setViewQuote(newQuote as Quote);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('quotes').delete().eq('id', id);
    setDeleteId(null);
    fetchAll();
  }

  async function handleStatusChange(id: string, status: Quote['status']) {
    await supabase.from('quotes').update({ status }).eq('id', id);
    setQuotes(quotes.map(q => q.id === id ? { ...q, status } : q));
  }

  function handleDownloadPDF(quote: Quote) {
    if (!settings) return;
    printQuotePDF(quote, settings);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orcamentos</h1>
          <p className="text-muted-foreground mt-1">Gere e gerencie orcamentos para seus clientes</p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Orcamento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : quotes.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhum orcamento gerado</h3>
          <p className="text-muted-foreground text-sm mb-6">Crie seu primeiro orcamento para um cliente.</p>
          <button onClick={openForm} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            Criar Orcamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const expanded = expandedId === q.id;
            const sc = STATUS_CONFIG[q.status];
            const StatusIcon = sc.icon;

            return (
              <div key={q.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-blue-50 rounded-xl p-2.5 flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{q.numero}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {q.cliente_nome}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {q.produto_nome}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                      <div className="text-lg font-bold text-foreground">{formatCurrency(q.total_final)}</div>
                      <div className={`text-xs font-medium ${q.margem_liquida >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {q.margem_liquida >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                        {q.margem_liquida.toFixed(1)}% margem
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => setViewQuote(q)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Visualizar PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(q)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-muted-foreground hover:text-blue-600"
                      title="Baixar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expanded ? null : q.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDeleteId(q.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-muted/20 px-5 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: 'Subtotal', value: formatCurrency(q.subtotal) },
                        { label: 'Impostos', value: formatCurrency(q.impostos) },
                        { label: 'Lucro liquido', value: formatCurrency(q.lucro_liquido) },
                        { label: 'Custo producao', value: formatCurrency(q.custos_totais * q.quantidade) },
                      ].map((item) => (
                        <div key={item.label} className="bg-white rounded-lg p-3 border border-border text-sm">
                          <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                          <div className="font-semibold text-foreground">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Alterar status:</span>
                      {(['pendente', 'aceito', 'recusado'] as const).map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(q.id, s)}
                            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                              q.status === s
                                ? cfg.color + ' border-transparent'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Quote Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-foreground">Novo Orcamento</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Client + Product */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Dados do orcamento</h3>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nome do cliente *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={form.cliente_nome}
                      onChange={(e) => handleFormChange('cliente_nome', e.target.value)}
                      placeholder="Ex: Joao Silva"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Produto *</label>
                  <select
                    value={form.produto_id}
                    onChange={(e) => handleFormChange('produto_id', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                  >
                    <option value="">Selecionar produto...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Tipo de preco</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['varejo', 'atacado'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleFormChange('price_mode', mode)}
                          className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                            form.price_mode === mode
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
                    <label className="block text-sm font-medium text-foreground mb-1.5">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantidade}
                      onChange={(e) => handleFormChange('quantidade', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Desconto (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.desconto}
                      onChange={(e) => handleFormChange('desconto', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Imposto (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.imposto}
                      onChange={(e) => handleFormChange('imposto', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Marketplace</label>
                    <select
                      value={form.marketplace_id}
                      onChange={(e) => handleFormChange('marketplace_id', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                    >
                      <option value="">Nenhum / Venda direta</option>
                      {marketplaces.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.taxa}%)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Validade (dias)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.validade_dias}
                      onChange={(e) => handleFormChange('validade_dias', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Observacoes <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                    placeholder="Condicoes especiais, prazo de entrega, etc."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              </div>

              {/* Live preview */}
              {simResult && pricing && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Previa do orcamento</h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Preco unitario</div>
                      <div className="text-base font-bold text-foreground">{formatCurrency(simResult.preco_unitario)}</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-blue-600 mb-1">Total</div>
                      <div className="text-base font-bold text-blue-700">{formatCurrency(simResult.total_final)}</div>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${simResult.margem_liquida >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className={`text-xs mb-1 ${simResult.margem_liquida >= 0 ? 'text-green-600' : 'text-red-500'}`}>Margem</div>
                      <div className={`text-base font-bold ${simResult.margem_liquida >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {simResult.margem_liquida.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                    {[
                      { label: 'Subtotal', v: simResult.subtotal },
                      { label: 'Impostos', v: simResult.impostos },
                      { label: 'Taxa marketplace', v: simResult.taxa_marketplace_valor },
                      { label: 'Lucro liquido', v: simResult.lucro_liquido },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className={`font-medium ${r.label === 'Lucro liquido' ? (r.v >= 0 ? 'text-green-600' : 'text-red-500') : 'text-foreground'}`}>
                          {formatCurrency(r.v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.cliente_nome || !form.produto_id}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Gerando...' : 'Gerar Orcamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Download modal */}
      {viewQuote && settings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewQuote(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{viewQuote.numero}</h2>
                <p className="text-sm text-muted-foreground">Cliente: {viewQuote.cliente_nome}</p>
              </div>
              <button onClick={() => setViewQuote(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">Produto</div>
                  <div className="font-semibold text-foreground text-sm">{viewQuote.produto_nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{viewQuote.quantidade} unidade{viewQuote.quantidade !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs text-blue-600 mb-1">Total</div>
                  <div className="font-bold text-blue-700 text-xl">{formatCurrency(viewQuote.total_final)}</div>
                  <div className="text-xs text-blue-500 mt-0.5">Preco {viewQuote.price_mode}</div>
                </div>
                <div className={`rounded-xl p-4 ${viewQuote.margem_liquida >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-xs mb-1 ${viewQuote.margem_liquida >= 0 ? 'text-green-600' : 'text-red-500'}`}>Margem liquida</div>
                  <div className={`font-bold text-xl ${viewQuote.margem_liquida >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {viewQuote.margem_liquida.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">Lucro liquido</div>
                  <div className={`font-bold text-xl ${viewQuote.lucro_liquido >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                    {formatCurrency(viewQuote.lucro_liquido)}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Orcamento gerado com sucesso!</strong> Clique em "Baixar PDF" para imprimir ou salvar.
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setViewQuote(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => { handleDownloadPDF(viewQuote); }}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-foreground">Excluir orcamento?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Esta acao nao pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
