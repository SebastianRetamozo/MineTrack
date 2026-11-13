import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../utils/helpers';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-50">
      <Sidebar />
      <div className={cn('main-content transition-all duration-200')}>
        <Header
          title="MineTrack"
          subtitle="Industrial Equipment Management"
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}