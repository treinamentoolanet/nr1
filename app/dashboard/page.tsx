'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Printer, Package, ShoppingBag, Calculator, TrendingUp, Users, Settings, ArrowRight, CircleCheck as CheckCircle2, Circle, Lightbulb } from 'lucide-react';

interface Stats {
  impressoras: number;
  filamentos: number;
  produtos: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ impressoras: 0, filamentos: 0, produtos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const settingsData = await supabase
        .from('user_settings')
        .select('practical_mode_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settingsData.data?.practical_mode_completed) {
        router.push('/dashboard/modo-pratico');
        return;
      }

      const [printers, filaments, products] = await Promise.all([
        supabase.from('printers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('filaments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        impressoras: printers.count ?? 0,
        filamentos: filaments.count ?? 0,
        produtos: products.count ?? 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, [router]);

  const checklist = [
    { label: 'Cadastrar uma impressora', done: stats.impressoras > 0, href: '/dashboard/impressoras' },
    { label: 'Adicionar um filamento', done: stats.filamentos > 0, href: '/dashboard/filamentos' },
    { label: 'Criar um produto', done: stats.produtos > 0, href: '/dashboard/produtos' },
    { label: 'Calcular preco', done: false, href: '/dashboard/precificacao' },
  ];

  const quickLinks = [
    { href: '/dashboard/impressoras', label: 'Impressoras', icon: Printer, color: 'bg-blue-500', desc: 'Gerencie suas maquinas' },
    { href: '/dashboard/filamentos', label: 'Filamentos', icon: Package, color: 'bg-green-500', desc: 'Controle seus materiais' },
    { href: '/dashboard/produtos', label: 'Produtos', icon: ShoppingBag, color: 'bg-orange-500', desc: 'Cadastre seus produtos' },
    { href: '/dashboard/precificacao', label: 'Precificacao', icon: Calculator, color: 'bg-blue-600', desc: 'Calcule custos e precos' },
    { href: '/dashboard/simulador', label: 'Simulador', icon: TrendingUp, color: 'bg-teal-500', desc: 'Simule cenarios de venda' },
    { href: '/dashboard/concorrencia', label: 'Concorrencia', icon: Users, color: 'bg-amber-500', desc: 'Compare com concorrentes' },
  ];

  const tips = [
    'Cadastre todas as suas impressoras com os dados corretos de consumo para calculos mais precisos.',
    'Use o simulador para testar diferentes precos e volumes antes de definir sua estrategia.',
    'Monitore os precos dos concorrentes regularmente para manter sua competitividade.',
    'Configure a tarifa de energia correta nas configuracoes para custos precisos.',
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visao geral do seu sistema de precificacao</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Impressoras', value: stats.impressoras, icon: Printer, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/impressoras' },
          { label: 'Filamentos', value: stats.filamentos, icon: Package, color: 'text-green-600', bg: 'bg-green-50', href: '/dashboard/filamentos' },
          { label: 'Produtos', value: stats.produtos, icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50', href: '/dashboard/produtos' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} rounded-xl p-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {loading ? '—' : stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label} cadastradas</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Checklist */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Inicio rapido
          </h2>
          <div className="space-y-3">
            {checklist.map((item, i) => (
              <Link key={i} href={item.href}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{checklist.filter(c => c.done).length}/{checklist.length}</span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(checklist.filter(c => c.done).length / checklist.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Dicas de uso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-amber-500 font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-sm text-amber-900 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <h2 className="font-semibold text-foreground mb-4">Acesso rapido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-center">
                <div className={`${link.color} rounded-xl p-2.5 group-hover:scale-110 transition-transform`}>
                  <link.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{link.label}</div>
                  <div className="text-xs text-muted-foreground">{link.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
