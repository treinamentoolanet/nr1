'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserSettings, Printer, Filament, Product } from '@/lib/types';
import { CircleCheck as CheckCircle2, Circle, Printer as PrinterIcon, Package, ShoppingBag, Calculator, ChevronRight, Loader, CircleAlert as AlertCircle } from 'lucide-react';

interface StepConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
  checkComplete: (data: any) => boolean;
}

const steps: StepConfig[] = [
  {
    title: 'Adicionar Impressora',
    description: 'Configure sua primeira impressora 3D',
    icon: <PrinterIcon className="w-8 h-8" />,
    fields: ['nome', 'valor_maquina'],
    checkComplete: (data) => data.printers && data.printers.length > 0,
  },
  {
    title: 'Adicionar Filamento',
    description: 'Cadastre um filamento para usar nos cálculos',
    icon: <Package className="w-8 h-8" />,
    fields: ['marca', 'custo'],
    checkComplete: (data) => data.filaments && data.filaments.length > 0,
  },
  {
    title: 'Criar Produto',
    description: 'Configure seu primeiro produto com peças',
    icon: <ShoppingBag className="w-8 h-8" />,
    fields: ['nome'],
    checkComplete: (data) => data.products && data.products.length > 0,
  },
  {
    title: 'Configurar Parâmetros',
    description: 'Defina tarifa de energia e margens de lucro',
    icon: <Calculator className="w-8 h-8" />,
    fields: ['tarifa_kwh', 'multiplicador_varejo'],
    checkComplete: (data) => data.settings && data.settings.tarifa_kwh > 0,
  },
  {
    title: 'Sucesso!',
    description: 'Você está pronto para gerar orçamentos',
    icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
    fields: [],
    checkComplete: () => true,
  },
];

export default function ModoPraticoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    checkSetupProgress();
  }, []);

  async function checkSetupProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const [settData, printersData, filamentsData, productsData] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('printers').select('id').eq('user_id', user.id),
      supabase.from('filaments').select('id').eq('user_id', user.id),
      supabase.from('products').select('id').eq('user_id', user.id),
    ]);

    if (settData.data) {
      setSettings(settData.data);
      if (settData.data.practical_mode_completed) {
        setCompleted(true);
        return;
      }
      setCurrentStep(settData.data.practical_mode_step);
    }

    setPrinters((printersData.data ?? []) as Printer[]);
    setFilaments((filamentsData.data ?? []) as Filament[]);
    setProducts((productsData.data ?? []) as Product[]);
    setLoading(false);
  }

  async function completeSetup() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_settings')
      .update({ practical_mode_completed: true, practical_mode_step: 5 })
      .eq('user_id', user.id);

    router.push('/dashboard/precificacao');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = { settings, printers, filaments, products };
  let completedSteps = 0;

  for (let i = 0; i < steps.length - 1; i++) {
    if (steps[i].checkComplete(data)) {
      completedSteps++;
    }
  }

  const step = steps[Math.min(currentStep, steps.length - 1)];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Modo Prático</h1>
          <p className="text-muted-foreground text-lg">
            Etapa {Math.min(currentStep + 1, steps.length)} de {steps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full transition-all ${
                  idx < completedSteps
                    ? 'bg-green-500'
                    : idx === currentStep
                      ? 'bg-primary'
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {steps.map((s, idx) => (
              <div key={idx} className="text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 transition-all ${
                    idx < completedSteps
                      ? 'bg-green-500 text-white'
                      : idx === currentStep
                        ? 'bg-primary text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {idx < completedSteps ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{s.title.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-primary">{step.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
              <p className="text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>

          {/* Step 1: Add Printer */}
          {currentStep === 0 && (
            <div className="space-y-4 mt-8">
              {printers.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Nenhuma impressora cadastrada</h3>
                    <p className="text-sm text-blue-700">
                      Você precisa adicionar uma impressora para continuar. Clique no botão abaixo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 font-medium">{printers.length} impressora(s) cadastrada(s)</p>
                </div>
              )}
              <button
                onClick={() => router.push('/dashboard/impressoras')}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Ir para Impressoras <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Add Filament */}
          {currentStep === 1 && (
            <div className="space-y-4 mt-8">
              {filaments.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Nenhum filamento cadastrado</h3>
                    <p className="text-sm text-blue-700">
                      Adicione pelo menos um filamento para calcular custos de material.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 font-medium">{filaments.length} filamento(s) cadastrado(s)</p>
                </div>
              )}
              <button
                onClick={() => router.push('/dashboard/filamentos')}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Ir para Filamentos <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 3: Create Product */}
          {currentStep === 2 && (
            <div className="space-y-4 mt-8">
              {products.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Nenhum produto cadastrado</h3>
                    <p className="text-sm text-blue-700">
                      Crie seu primeiro produto com pelo menos uma peça e configure impressora e filamento.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 font-medium">{products.length} produto(s) cadastrado(s)</p>
                </div>
              )}
              <button
                onClick={() => router.push('/dashboard/produtos')}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Ir para Produtos <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 4: Configure Settings */}
          {currentStep === 3 && (
            <div className="space-y-4 mt-8">
              {settings && settings.tarifa_kwh > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <p className="font-medium text-green-700">Configurações concluídas</p>
                  </div>
                  <div className="text-sm text-green-700 space-y-1 pl-8">
                    <p>Tarifa: R$ {settings.tarifa_kwh}/kWh</p>
                    <p>Margem Varejo: {((settings.multiplicador_varejo - 1) * 100).toFixed(0)}%</p>
                    <p>Margem Atacado: {((settings.multiplicador_atacado - 1) * 100).toFixed(0)}%</p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Configure seus parâmetros</h3>
                    <p className="text-sm text-blue-700">
                      Defina a tarifa de energia e margens de lucro para seus cálculos.
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => router.push('/dashboard/configuracoes')}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Ir para Configurações <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 5: Success */}
          {isLastStep && (
            <div className="space-y-6 mt-8">
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-900 mb-2">Parabéns!</h3>
                <p className="text-green-700 mb-4">
                  Você completou todo o setup. Agora está pronto para gerar seus primeiros orçamentos.
                </p>
                <div className="bg-white rounded-lg p-4 text-left text-sm space-y-2 text-green-800">
                  <p>✓ {printers.length} impressora(s) configurada(s)</p>
                  <p>✓ {filaments.length} filamento(s) cadastrado(s)</p>
                  <p>✓ {products.length} produto(s) criado(s)</p>
                  <p>✓ Parâmetros configurados</p>
                </div>
              </div>
              <button
                onClick={completeSetup}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-lg"
              >
                Começar a Gerar Orçamentos <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {!isLastStep && completedSteps > currentStep && (
          <div className="mt-6 flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={async () => {
                  setCurrentStep(currentStep - 1);
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from('user_settings')
                      .update({ practical_mode_step: currentStep - 1 })
                      .eq('user_id', user.id);
                  }
                }}
                className="flex-1 bg-gray-300 text-foreground py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Voltar
              </button>
            )}
            <button
              onClick={async () => {
                setCurrentStep(currentStep + 1);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase
                    .from('user_settings')
                    .update({ practical_mode_step: currentStep + 1 })
                    .eq('user_id', user.id);
                }
              }}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Próxima Etapa <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
