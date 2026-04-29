'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Filament } from '@/lib/types';
import { Package, Plus, Pencil, Trash2, X, Save, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';

const emptyForm = {
  marca: '',
  descricao: '',
  peso_kg: '1',
  custo: '',
};

export default function FilamentosPage() {
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Filament | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchFilaments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('filaments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setFilaments(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchFilaments(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(f: Filament) {
    setEditing(f);
    setForm({
      marca: f.marca,
      descricao: f.descricao ?? '',
      peso_kg: String(f.peso_kg),
      custo: String(f.custo),
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      marca: form.marca,
      descricao: form.descricao || null,
      peso_kg: parseFloat(form.peso_kg) || 1,
      custo: parseFloat(form.custo) || 0,
    };

    if (editing) {
      await supabase.from('filaments').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('filaments').insert(payload);
      const settings = await supabase.from('user_settings').select('practical_mode_step').eq('user_id', user.id).maybeSingle();
      if (settings.data && settings.data.practical_mode_step === 1) {
        await supabase.from('user_settings').update({ practical_mode_step: 2 }).eq('user_id', user.id);
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchFilaments();
  }

  async function handleDelete(id: string) {
    await supabase.from('filaments').delete().eq('id', id);
    setDeleteId(null);
    fetchFilaments();
  }

  const custoPorGrama = (f: Filament) => f.custo / (f.peso_kg * 1000);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filamentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus materiais de impressao</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Filamento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filaments.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhum filamento cadastrado</h3>
          <p className="text-muted-foreground text-sm mb-6">Adicione filamentos para calcular o custo de material.</p>
          <button onClick={openAdd} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Adicionar Filamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-6 py-3">Marca</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Descricao</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Peso</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Custo/Rolo</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Custo/g</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filaments.map((f) => (
                <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 rounded-lg p-2">
                        <Package className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-medium text-foreground">{f.marca}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{f.descricao ?? '—'}</td>
                  <td className="px-4 py-4 text-sm text-right font-medium text-foreground">{f.peso_kg} kg</td>
                  <td className="px-4 py-4 text-sm text-right font-semibold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.custo)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoPorGrama(f))}/g
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editing ? 'Editar Filamento' : 'Novo Filamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Marca *</label>
                <input
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  placeholder="Ex: Polymaker, eSUN, Bambu..."
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Descricao</label>
                <input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: PLA+ Preto, PETG Transparente..."
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Peso do rolo (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.peso_kg}
                    onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Custo do rolo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.custo}
                    onChange={(e) => setForm({ ...form, custo: e.target.value })}
                    placeholder="80.00"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>

              {form.custo && form.peso_kg && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  Custo por grama: <strong>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      parseFloat(form.custo) / (parseFloat(form.peso_kg) * 1000)
                    )}/g
                  </strong>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.marca || !form.custo}
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
              <h3 className="font-semibold text-foreground">Excluir filamento?</h3>
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
