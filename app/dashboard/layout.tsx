'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Printer,
  Package,
  ShoppingBag,
  Calculator,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  FileText,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/impressoras', label: 'Impressoras', icon: Printer },
  { href: '/dashboard/filamentos', label: 'Filamentos', icon: Package },
  { href: '/dashboard/produtos', label: 'Produtos', icon: ShoppingBag },
  { href: '/dashboard/precificacao', label: 'Precificacao', icon: Calculator },
  { href: '/dashboard/simulador', label: 'Simulador', icon: TrendingUp },
  { href: '/dashboard/orcamentos', label: 'Orcamentos', icon: FileText },
  { href: '/dashboard/concorrencia', label: 'Concorrencia', icon: Users },
  { href: '/dashboard/configuracoes', label: 'Configuracoes', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email ?? '');
      }
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-blue-700/50">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Print3D</div>
            <div className="text-blue-200 text-xs">Pricing System</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-3 pb-4 border-t border-blue-700/50 pt-4">
        <div className="bg-white/10 rounded-lg p-3 mb-3">
          <p className="text-blue-100 text-xs truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-red-500/20 hover:text-red-200 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4">
              <span className="text-white font-bold">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Print3D Pricing</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
