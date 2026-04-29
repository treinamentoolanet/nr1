'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Printer, Filament, ProductPart } from '@/lib/types';
import { ShoppingBag, Plus, Pencil, Trash2, X, Save, Loader as Loader2, CircleAlert as AlertCircle, ChevronDown, ChevronUp, CirclePlus as PlusCircle } from 'lucide-react';

const emptyProduct = { nome: '', descricao: '', printer_id: '', filament_id: '' };
const emptyPart = { nome: '', tempo_impressao: '', peso_estimado: '', percentual_acabamento: '0' };

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [parts, setParts] = useState<(typeof emptyPart)[]>([{ ...emptyPart }]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [prods, prins, fils] = await Promise.all([
      supabase
        .from('products')
        .select('*, printers(nome,marca), filaments(marca,descricao), product_parts(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('printers').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('filaments').select('*').eq('user_id', user.id).order('marca'),
    ]);

    setProducts(prods.data ?? []);
    setPrinters(prins.data ?? []);
    setFilaments(fils.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyProduct);
    setParts([{ ...emptyPart }]);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      printer_id: p.printer_id ?? '',
      filament_id: p.filament_id ?? '',
    });
    const existingParts = (p.product_parts ?? []).map((pp: ProductPart) => ({
      nome: pp.nome,
      tempo_impressao: String(pp.tempo_impressao),
      peso_estimado: String(pp.peso_estimado),
      percentual_acabamento: String(pp.percentual_acabamento * 100),
    }));
    setParts(existingParts.length > 0 ? existingParts : [{ ...emptyPart }]);
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const productPayload = {
      user_id: user.id,
      nome: form.nome,
      descricao: form.descricao || null,
      printer_id: form.printer_id || null,
      filament_id: form.filament_id || null,
    };

    let productId = editing?.id;

    if (editing) {
      await supabase.from('products').update(productPayload).eq('id', editing.id);
      await supabase.from('product_parts').delete().eq('product_id', editing.id);
    } else {
      const { data } = await supabase.from('products').insert(productPayload).select().single();
      productId = data?.id;
    }

    if (productId) {
      const partsPayload = parts
        .filter((p) => p.nome)
        .map((p) => ({
          product_id: productId!,
          nome: p.nome,
          tempo_impressao: parseFloat(p.tempo_impressao) || 0,
          peso_estimado: parseFloat(p.peso_estimado) || 0,
          percentual_acabamento: (parseFloat(p.percentual_acabamento) || 0) / 100,
        }));
      if (partsPayload.length > 0) {
        await supabase.from('product_parts').insert(partsPayload);
      }
    }

    if (!editing) {
      const settings = await supabase.from('user_settings').select('practical_mode_step').eq('user_id', user.id).maybeSingle();
      if (settings.data && settings.data.practical_mode_step === 2) {
        await supabase.from('user_settings').update({ practical_mode_step: 3 }).eq('user_id', user.id);
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchAll();
  }

  async function handleDelete(id: string) {
    await supabase.from('products').delete().eq('id', id);
    setDeleteId(null);
    fetchAll();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus produtos e pecas para impressao</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhum produto cadastrado</h3>
          <p className="text-muted-foreground text-sm mb-6">Crie produtos com suas pecas para calcular precos.</p>
          <button onClick={openAdd} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            Criar Produto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const expanded = expandedId === p.id;
            const totalTempo = (p.product_parts ?? []).reduce((s, pp) => s + pp.tempo_impressao, 0);
            const totalPeso = (p.product_parts ?? []).reduce((s, pp) => s + pp.peso_estimado, 0);

            return (
              <div key={p.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-orange-50 rounded-xl p-2.5 flex-shrink-0">
                      <ShoppingBag className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p.nome}</h3>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {(p as any).printers && (
                          <span className="text-xs text-muted-foreground">{(p as any).printers.nome}</span>
                        )}
                        {(p as any).filaments && (
                          <span className="text-xs text-muted-foreground">{(p as any).filaments.marca}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{(p.product_parts ?? []).length} peca(s)</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 ml-4 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-foreground">{totalTempo.toFixed(1)}h</div>
                        <div className="text-xs text-muted-foreground">Tempo</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-foreground">{totalPeso.toFixed(1)}g</div>
                        <div className="text-xs text-muted-foreground">Peso</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expanded && (p.product_parts ?? []).length > 0 && (
                  <div className="border-t border-border bg-muted/20 px-5 py-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pecas</h4>
                    <div className="space-y-2">
                      {(p.product_parts ?? []).map((pp, i) => (
                        <div key={pp.id} className="flex items-center gap-4 bg-white rounded-lg p-3 border border-border text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                          <span className="font-medium text-foreground flex-1">{pp.nome}</span>
                          <span className="text-muted-foreground">{pp.tempo_impressao}h</span>
                          <span className="text-muted-foreground">{pp.peso_estimado}g</span>
                          <span className="text-muted-foreground">{(pp.percentual_acabamento * 100).toFixed(0)}% acab.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Informacoes do produto</h3>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nome *</label>
                  <input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Suporte de Celular"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Descricao</label>
                  <input
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Descricao opcional"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Impressora</label>
                    <select
                      value={form.printer_id}
                      onChange={(e) => setForm({ ...form, printer_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                    >
                      <option value="">Selecionar...</option>
                      {printers.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Filamento</label>
                    <select
                      value={form.filament_id}
                      onChange={(e) => setForm({ ...form, filament_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                    >
                      <option value="">Selecionar...</option>
                      {filaments.map((f) => (
                        <option key={f.id} value={f.id}>{f.marca} {f.descricao ? `- ${f.descricao}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Parts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-foreground">Pecas</h3>
                  <button
                    onClick={() => setParts([...parts, { ...emptyPart }])}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Adicionar peca
                  </button>
                </div>

                {parts.map((part, i) => (
                  <div key={i} className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Peca {i + 1}</span>
                      {parts.length > 1 && (
                        <button
                          onClick={() => setParts(parts.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      value={part.nome}
                      onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, nome: e.target.value } : p))}
                      placeholder="Nome da peca"
                      className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tempo (horas)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={part.tempo_impressao}
                          onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, tempo_impressao: e.target.value } : p))}
                          placeholder="2.5"
                          className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Peso (gramas)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={part.peso_estimado}
                          onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, peso_estimado: e.target.value } : p))}
                          placeholder="50"
                          className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Acabamento (%)</label>
                        <input
                          type="number"
                          step="1"
                          value={part.percentual_acabamento}
                          onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, percentual_acabamento: e.target.value } : p))}
                          placeholder="10"
                          className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome}
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
              <div className="bg-red-50 rounded-xl p-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-foreground">Excluir produto?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Todas as pecas e dados do produto serao excluidos permanentemente.</p>
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
