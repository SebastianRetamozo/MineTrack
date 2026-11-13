import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Wrench, Settings, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

const navigation = [
  { name: 'Panel Principal', href: '/', icon: LayoutDashboard },
  { name: 'Equipos', href: '/equipos', icon: Truck },
  { name: 'Mantenimiento', href: '/mantenimiento', icon: Wrench },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
  { name: 'Ayuda', href: '/ayuda', icon: HelpCircle },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="flex items-center justify-between h-16 px-6 border-b border-navy-800">
        <h1 className="text-xl font-bold text-white">MineTrack</h1>
      </div>
      <nav className="flex-1 py-4 space-y-2 px-4" aria-label="Navegación">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'sidebar-item sidebar-icon rounded-lg',
                isActive ? 'sidebar-item-active' : ''
              )
            }
            aria-current={location.pathname === item.href ? 'page' : undefined}
          >
            <item.icon className="sidebar-icon" aria-hidden="true" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-navy-800">
        <div className="text-xs text-navy-400">
          MineTrack v1.0.0
        </div>
      </div>
    </aside>
  );
}