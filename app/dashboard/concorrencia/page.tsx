'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Printer, Filament, ProductPart, UserSettings, Competitor } from '@/lib/types';
import { calcularPrecificacao, formatCurrency } from '@/lib/calculations';
import { Users, Plus, Pencil, Trash2, X, Save, Loader as Loader2, CircleAlert as AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ConcorrenciaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<ReturnType<typeof calcularPrecificacao> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [form, setForm] = useState({ nome: '', preco: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prods, sett] = await Promise.all([
        supabase.from('products').select('*, printers(*), filaments(*), product_parts(*)').eq('user_id', user.id).order('nome'),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      setProducts(prods.data ?? []);
      if (sett.data) setSettings(sett.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function fetchCompetitors(productId: string) {
    const { data } = await supabase.from('competitors').select('*').eq('product_id', productId).order('preco');
    setCompetitors(data ?? []);

    const product = products.find((p) => p.id === productId);
    if (product && settings) {
      const printer = (product as any).printers as Printer | null;
      const filament = (product as any).filaments as Filament | null;
      const parts = (product.product_parts ?? []) as ProductPart[];

      if (printer && filament && parts.length > 0) {
        setPricing(calcularPrecificacao(printer, filament, parts, settings));
      } else {
        setPricing(null);
      }
    }
  }

  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    setCompetitors([]);
    setPricing(null);
    if (productId) fetchCompetitors(productId);
  }

  function openAdd() {
    setEditing(null);
    setForm({ nome: '', preco: '' });
    setShowModal(true);
  }

  function openEdit(c: Competitor) {
    setEditing(c);
    setForm({ nome: c.nome, preco: String(c.preco) });
    setShowModal(true);
  }

  async function handleSave() {
    if (!selectedProductId) return;
    setSaving(true);

    const payload = { product_id: selectedProductId, nome: form.nome, preco: parseFloat(form.preco) || 0 };

    if (editing) {
      await supabase.from('competitors').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('competitors').insert(payload);
    }

    setSaving(false);
    setShowModal(false);
    fetchCompetitors(selectedProductId);
  }

  async function handleDelete(id: string) {
    await supabase.from('competitors').delete().eq('id', id);
    setDeleteId(null);
    fetchCompetitors(selectedProductId);
  }

  function getDiffPercent(competitorPrice: number, myPrice: number) {
    return ((myPrice - competitorPrice) / competitorPrice) * 100;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Concorrencia</h1>
          <p className="text-muted-foreground mt-1">Compare seus precos com a concorrencia</p>
        </div>
        {selectedProductId && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Concorrente
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Product selector */}
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <label className="block text-sm font-medium text-foreground mb-2">Selecionar Produto</label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full max-w-sm px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            >
              <option value="">Selecionar...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {selectedProductId && (
            <>
              {/* My prices */}
              {pricing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="text-sm text-blue-600 mb-1">Meu preco atacado</div>
                    <div className="text-2xl font-bold text-blue-700">{formatCurrency(pricing.preco_atacado)}</div>
                    <div className="text-xs text-blue-500 mt-1">Margem: {pricing.margem_atacado.toFixed(1)}%</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <div className="text-sm text-green-600 mb-1">Meu preco varejo</div>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(pricing.preco_varejo)}</div>
                    <div className="text-xs text-green-500 mt-1">Margem: {pricing.margem_varejo.toFixed(1)}%</div>
                  </div>
                </div>
              )}

              {/* Competitors table */}
              {competitors.length === 0 ? (
                <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">Nenhum concorrente cadastrado</h3>
                  <p className="text-muted-foreground text-sm mb-5">Adicione concorrentes para comparar precos.</p>
                  <button onClick={openAdd} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                    Adicionar Concorrente
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-6 py-3">Concorrente</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Preco</th>
                        {pricing && (
                          <>
                            <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">vs Atacado</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">vs Varejo</th>
                          </>
                        )}
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {competitors.map((c) => {
                        const diffAtacado = pricing ? getDiffPercent(c.preco, pricing.preco_atacado) : null;
                        const diffVarejo = pricing ? getDiffPercent(c.preco, pricing.preco_varejo) : null;

                        return (
                          <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">{c.nome}</td>
                            <td className="px-4 py-4 text-right font-semibold text-foreground">
                              {formatCurrency(c.preco)}
                            </td>
                            {pricing && diffAtacado !== null && (
                              <td className="px-4 py-4 text-right">
                                <span className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
                                  diffAtacado > 5 ? 'bg-green-100 text-green-700' :
                                  diffAtacado < -5 ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {diffAtacado > 5 ? <TrendingDown className="w-3 h-3" /> :
                                   diffAtacado < -5 ? <TrendingUp className="w-3 h-3" /> :
                                   <Minus className="w-3 h-3" />}
                                  {diffAtacado > 0 ? '+' : ''}{diffAtacado.toFixed(1)}%
                                </span>
                              </td>
                            )}
                            {pricing && diffVarejo !== null && (
                              <td className="px-4 py-4 text-right">
                                <span className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
                                  diffVarejo > 5 ? 'bg-green-100 text-green-700' :
                                  diffVarejo < -5 ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {diffVarejo > 5 ? <TrendingDown className="w-3 h-3" /> :
                                   diffVarejo < -5 ? <TrendingUp className="w-3 h-3" /> :
                                   <Minus className="w-3 h-3" />}
                                  {diffVarejo > 0 ? '+' : ''}{diffVarejo.toFixed(1)}%
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {pricing && (
                    <div className="px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                      Legenda: Verde = meu preco e mais alto que o concorrente | Vermelho = meu preco e mais baixo
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedProductId && (
            <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Selecione um produto</h3>
              <p className="text-muted-foreground text-sm">Escolha um produto acima para ver e gerenciar os concorrentes.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Concorrente' : 'Novo Concorrente'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Loja do Joao, Amazon..."
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Preco (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="49.90"
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome || !form.preco}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-2"><AlertCircle className="w-6 h-6 text-red-500" /></div>
              <h3 className="font-semibold text-foreground">Excluir concorrente?</h3>
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
