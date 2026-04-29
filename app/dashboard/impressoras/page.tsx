'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer } from '@/lib/types';
import { Printer as PrinterIcon, Plus, Pencil, Trash2, X, Save, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';

const NIVEL_LABELS: Record<string, string> = {
  basico: 'Basico (10%)',
  medio: 'Medio (20%)',
  profissional: 'Profissional (30%)',
};

const emptyForm = {
  nome: '',
  marca: '',
  valor_maquina: '',
  tempo_retorno: '12',
  horas_dia: '8',
  dias_mes: '22',
  potencia_kw: '0.3',
  nivel_uso: 'medio',
  percentual_falhas: '5',
};

export default function ImpressorasPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchPrinters() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('printers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPrinters(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchPrinters(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(printer: Printer) {
    setEditing(printer);
    setForm({
      nome: printer.nome,
      marca: printer.marca ?? '',
      valor_maquina: String(printer.valor_maquina),
      tempo_retorno: String(printer.tempo_retorno),
      horas_dia: String(printer.horas_dia),
      dias_mes: String(printer.dias_mes),
      potencia_kw: String(printer.potencia_kw),
      nivel_uso: printer.nivel_uso,
      percentual_falhas: String(printer.percentual_falhas * 100),
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      nome: form.nome,
      marca: form.marca || null,
      valor_maquina: parseFloat(form.valor_maquina) || 0,
      tempo_retorno: parseInt(form.tempo_retorno) || 12,
      horas_dia: parseInt(form.horas_dia) || 8,
      dias_mes: parseInt(form.dias_mes) || 22,
      potencia_kw: parseFloat(form.potencia_kw) || 0.3,
      nivel_uso: form.nivel_uso,
      percentual_falhas: (parseFloat(form.percentual_falhas) || 0) / 100,
    };

    if (editing) {
      await supabase.from('printers').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('printers').insert(payload);
      const settings = await supabase.from('user_settings').select('practical_mode_step').eq('user_id', user.id).maybeSingle();
      if (settings.data && settings.data.practical_mode_step === 0) {
        await supabase.from('user_settings').update({ practical_mode_step: 1 }).eq('user_id', user.id);
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchPrinters();
  }

  async function handleDelete(id: string) {
    await supabase.from('printers').delete().eq('id', id);
    setDeleteId(null);
    fetchPrinters();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impressoras</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas impressoras 3D</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Impressora
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
          <PrinterIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhuma impressora cadastrada</h3>
          <p className="text-muted-foreground text-sm mb-6">Adicione sua primeira impressora para comecar a calcular precos.</p>
          <button
            onClick={openAdd}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Adicionar Impressora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {printers.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 rounded-xl p-2.5">
                    <PrinterIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{p.nome}</h3>
                    {p.marca && <p className="text-xs text-muted-foreground">{p.marca}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Valor</div>
                  <div className="font-semibold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_maquina)}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Retorno</div>
                  <div className="font-semibold text-foreground">{p.tempo_retorno} meses</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Uso diario</div>
                  <div className="font-semibold text-foreground">{p.horas_dia}h/dia</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Nivel</div>
                  <div className="font-semibold text-foreground capitalize">{p.nivel_uso}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Potencia</div>
                  <div className="font-semibold text-foreground">{p.potencia_kw} kW</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Falhas</div>
                  <div className="font-semibold text-foreground">{(p.percentual_falhas * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editing ? 'Editar Impressora' : 'Nova Impressora'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nome *</label>
                  <input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Ender 3 Pro"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Marca</label>
                  <input
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    placeholder="Ex: Creality"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Valor da maquina (R$) *</label>
                  <input
                    type="number"
                    value={form.valor_maquina}
                    onChange={(e) => setForm({ ...form, valor_maquina: e.target.value })}
                    placeholder="1500.00"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Retorno (meses)</label>
                  <input
                    type="number"
                    value={form.tempo_retorno}
                    onChange={(e) => setForm({ ...form, tempo_retorno: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Horas/dia</label>
                  <input
                    type="number"
                    value={form.horas_dia}
                    onChange={(e) => setForm({ ...form, horas_dia: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Dias/mes</label>
                  <input
                    type="number"
                    value={form.dias_mes}
                    onChange={(e) => setForm({ ...form, dias_mes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Potencia (kW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.potencia_kw}
                    onChange={(e) => setForm({ ...form, potencia_kw: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nivel de uso</label>
                  <select
                    value={form.nivel_uso}
                    onChange={(e) => setForm({ ...form, nivel_uso: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                  >
                    <option value="basico">Basico (10% desgaste)</option>
                    <option value="medio">Medio (20% desgaste)</option>
                    <option value="profissional">Profissional (30% desgaste)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Taxa de falhas (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.percentual_falhas}
                    onChange={(e) => setForm({ ...form, percentual_falhas: e.target.value })}
                    placeholder="5"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome || !form.valor_maquina}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-foreground">Excluir impressora?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Esta acao nao pode ser desfeita. Produtos associados a esta impressora perderao o vinculo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
