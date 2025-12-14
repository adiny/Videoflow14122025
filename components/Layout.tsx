import React from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Settings, 
  HelpCircle, 
  LogOut, 
  PlusCircle,
  Video
} from 'lucide-react';
import { MOCK_USER } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePath?: string;
  onNavigate: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePath = '/', onNavigate }) => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FolderOpen, label: 'Templates', path: '/templates' },
    { icon: Video, label: 'Assets', path: '/assets' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('/')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">VideoFlow</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                activePath === item.path 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activePath === item.path ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-4">
            <button className="flex items-center space-x-3 text-sm font-medium text-slate-600 hover:text-slate-900 px-3">
                <HelpCircle className="w-5 h-5 text-slate-400" />
                <span>Help & Support</span>
            </button>
          
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <img 
              src={MOCK_USER.avatar_url} 
              alt={MOCK_USER.full_name} 
              className="w-9 h-9 rounded-full bg-slate-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{MOCK_USER.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{MOCK_USER.credits} credits left</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
         <div className="flex-1 overflow-y-auto">
             {children}
         </div>
      </main>
    </div>
  );
};