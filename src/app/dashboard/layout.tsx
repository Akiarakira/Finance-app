import Sidebar from '@/components/Sidebar';
import { Bell, User } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Fijo */}
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400">Hoy: 05 Feb, 2026</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Widget de Tasas (Visualización rápida) */}
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">BCV: 36.50</span>
              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">BIN: 38.20</span>
            </div>
            
            <button className="text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                JD
              </div>
              <span className="text-sm font-medium text-slate-700">Usuario</span>
            </div>
          </div>
        </header>

        {/* Contenido de la Página */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}