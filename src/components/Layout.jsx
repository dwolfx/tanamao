import React from 'react';
import { Camera, Map, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children, activeTab, onTabChange }) {
  const tabs = [
    { id: 'scan', label: 'Escanear', icon: Camera },
    { id: 'route', label: 'Minha Rota', icon: Map },
    { id: 'completed', label: 'Concluídas', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen pb-20 flex flex-col max-w-md mx-auto bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-surface">
        <h1 className="text-xl font-extrabold tracking-tighter text-primary">
          TÁ NA MÃO
        </h1>
        <div className="w-8 h-8 rounded-full bg-surface border border-primary/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">ID</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-x-hidden overflow-y-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-lg border-t border-white/10 max-w-md mx-auto">
        <div className="flex justify-around items-center h-16 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 transition-all duration-200",
                  isActive ? "text-primary scale-110" : "text-secondary opacity-60"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
