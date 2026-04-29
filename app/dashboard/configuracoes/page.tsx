'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserSettings, Marketplace } from '@/lib/types';
import { Settings, Save, Loader as Loader2, Plus, Pencil, Trash2, X, CircleAlert as AlertCircle, Zap, RotateCcw, TrendingUp, ShoppingCart, CircleCheck as CheckCircle2, Rocket, Building2, Phone } from 'lucide-react';

const emptyMarketplace = { nome: '', taxa: '', tarifa_fixa: '0' };

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savedCompany, setSavedCompany] = useState(false);
  const [form, setForm] = useState({
    tarifa_kwh: '',
    depreciacao_global: '',
    multiplicador_atacado: '',
    multiplicador_varejo: '',
  });
  const [companyForm, setCompanyForm] = useState({
    empresa_nome: '',
    empresa_cnpj: '',
    empresa_contato: '',
    empresa_endereco: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [editingMarketplace, setEditingMarketplace] = useState<Marketplace | null>(null);
  const [marketplaceForm, setMarketplaceForm] = useState(emptyMarketplace);
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [sett, mkts] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('marketplaces').select('*').eq('user_id', user.id).order('nome'),
      ]);

      if (sett.data) {
        setSettings(sett.data);
        setForm({
          tarifa_kwh: String(sett.data.tarifa_kwh),
          depreciacao_global: String(sett.data.depreciacao_global),
          multiplicador_atacado: String(sett.data.multiplicador_atacado),
          multiplicador_varejo: String(sett.data.multiplicador_varejo),
        });
        setCompanyForm({
          empresa_nome: sett.data.empresa_nome ?? '',
          empresa_cnpj: sett.data.empresa_cnpj ?? '',
          empresa_contato: sett.data.empresa_contato ?? '',
          empresa_endereco: sett.data.empresa_endereco ?? '',
        });
      }
      setMarketplaces(mkts.data ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      tarifa_kwh: parseFloat(form.tarifa_kwh) || 0.75,
      depreciacao_global: parseInt(form.depreciacao_global) || 60,
      multiplicador_atacado: parseFloat(form.multiplicador_atacado) || 1.5,
      multiplicador_varejo: parseFloat(form.multiplicador_varejo) || 2.0,
    };

    if (settings) {
      await supabase.from('user_settings').update(payload).eq('user_id', user.id);
    } else {
      await supabase.from('user_settings').insert(payload);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSaveCompany() {
    setSavingCompany(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      empresa_nome: companyForm.empresa_nome,
      empresa_cnpj: companyForm.empresa_cnpj,
      empresa_contato: companyForm.empresa_contato,
      empresa_endereco: companyForm.empresa_endereco,
    };

    await supabase.from('user_settings').update(payload).eq('user_id', user.id);

    setSavingCompany(false);
    setSavedCompany(true);
    setTimeout(() => setSavedCompany(false), 3000);
  }

  async function fetchMarketplaces() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('marketplaces').select('*').eq('user_id', user.id).order('nome');
    setMarketplaces(data ?? []);
  }

  function openAddMarketplace() {
    setEditingMarketplace(null);
    setMarketplaceForm(emptyMarketplace);
    setShowModal(true);
  }

  function openEditMarketplace(m: Marketplace) {
    setEditingMarketplace(m);
    setMarketplaceForm({ nome: m.nome, taxa: String(m.taxa), tarifa_fixa: String(m.tarifa_fixa) });
    setShowModal(true);
  }

  async function handleSaveMarketplace() {
    setSavingMarketplace(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      nome: marketplaceForm.nome,
      taxa: parseFloat(marketplaceForm.taxa) || 0,
      tarifa_fixa: parseFloat(marketplaceForm.tarifa_fixa) || 0,
    };

    if (editingMarketplace) {
      await supabase.from('marketplaces').update(payload).eq('id', editingMarketplace.id);
    } else {
      await supabase.from('marketplaces').insert(payload);
    }

    setSavingMarketplace(false);
    setShowModal(false);
    fetchMarketplaces();
  }

  async function handleDeleteMarketplace(id: string) {
    await supabase.from('marketplaces').delete().eq('id', id);
    setDeleteId(null);
    fetchMarketplaces();
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
          <p className="text-muted-foreground mt-1">Configure parametros globais, empresa e marketplaces</p>
        </div>
        {settings?.practical_mode_completed && (
          <button
            onClick={() => router.push('/dashboard/modo-pratico')}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Modo Pratico
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: Global Settings + Company */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Global Settings */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Configuracoes Globais</h2>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                Estas configuracoes sao aplicadas a todos os calculos de precificacao.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Tarifa de energia (R$/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.tarifa_kwh}
                    onChange={(e) => setForm({ ...form, tarifa_kwh: e.target.value })}
                    placeholder="0.75"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Consulte sua conta de luz para o valor atual</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                    <RotateCcw className="w-4 h-4 text-gray-500" />
                    Meses de depreciacao
                  </label>
                  <input
                    type="number"
                    value={form.depreciacao_global}
                    onChange={(e) => setForm({ ...form, depreciacao_global: e.target.value })}
                    placeholder="60"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Periodo para calculo da depreciacao dos equipamentos</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Multiplicador atacado
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.multiplicador_atacado}
                    onChange={(e) => setForm({ ...form, multiplicador_atacado: e.target.value })}
                    placeholder="1.5"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 1.5 = custo + 50% de margem. Atual: {((parseFloat(form.multiplicador_atacado) - 1) * 100).toFixed(0)}% margem
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Multiplicador varejo
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.multiplicador_varejo}
                    onChange={(e) => setForm({ ...form, multiplicador_varejo: e.target.value })}
                    placeholder="2.0"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 2.0 = custo + 100% de margem. Atual: {((parseFloat(form.multiplicador_varejo) - 1) * 100).toFixed(0)}% margem
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                } disabled:opacity-50`}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Configuracoes salvas!</>
                ) : (
                  <><Save className="w-4 h-4" /> Salvar configuracoes</>
                )}
              </button>
            </div>

            {/* Company Settings */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Dados da Empresa</h2>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                Estes dados aparecerao nos orcamentos gerados em PDF.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nome da empresa *
                  </label>
                  <input
                    value={companyForm.empresa_nome}
                    onChange={(e) => setCompanyForm({ ...companyForm, empresa_nome: e.target.value })}
                    placeholder="Ex: Minha Impressora 3D"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    CNPJ <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    value={companyForm.empresa_cnpj}
                    onChange={(e) => setCompanyForm({ ...companyForm, empresa_cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Contato <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    value={companyForm.empresa_contato}
                    onChange={(e) => setCompanyForm({ ...companyForm, empresa_contato: e.target.value })}
                    placeholder="(11) 99999-9999 | email@empresa.com"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Endereco <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    value={companyForm.empresa_endereco}
                    onChange={(e) => setCompanyForm({ ...companyForm, empresa_endereco: e.target.value })}
                    placeholder="Rua Exemplo, 123 - Cidade/UF"
                    className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveCompany}
                disabled={savingCompany || !companyForm.empresa_nome}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  savedCompany
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                } disabled:opacity-50`}
              >
                {savingCompany ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : savedCompany ? (
                  <><CheckCircle2 className="w-4 h-4" /> Empresa salva!</>
                ) : (
                  <><Save className="w-4 h-4" /> Salvar empresa</>
                )}
              </button>
            </div>
          </div>

          {/* Marketplaces */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Marketplaces</h2>
              </div>
              <button
                onClick={openAddMarketplace}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {marketplaces.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhum marketplace cadastrado. Adicione plataformas como Mercado Livre, Shopee, etc.
                </p>
                <button
                  onClick={openAddMarketplace}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Adicionar Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {marketplaces.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div>
                      <div className="font-medium text-foreground">{m.nome}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Taxa: {m.taxa}% + R$ {m.tarifa_fixa.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditMarketplace(m)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(m.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">{editingMarketplace ? 'Editar Marketplace' : 'Novo Marketplace'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nome *</label>
                <input
                  value={marketplaceForm.nome}
                  onChange={(e) => setMarketplaceForm({ ...marketplaceForm, nome: e.target.value })}
                  placeholder="Ex: Mercado Livre, Shopee, Etsy..."
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Taxa percentual (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={marketplaceForm.taxa}
                  onChange={(e) => setMarketplaceForm({ ...marketplaceForm, taxa: e.target.value })}
                  placeholder="12.0"
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tarifa fixa por venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={marketplaceForm.tarifa_fixa}
                  onChange={(e) => setMarketplaceForm({ ...marketplaceForm, tarifa_fixa: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button
                onClick={handleSaveMarketplace}
                disabled={savingMarketplace || !marketplaceForm.nome}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {savingMarketplace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingMarketplace ? 'Salvando...' : 'Salvar'}
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
              <h3 className="font-semibold text-foreground">Excluir marketplace?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Esta acao nao pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={() => handleDeleteMarketplace(deleteId)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
