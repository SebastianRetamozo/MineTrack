import { User, Menu, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, actions, onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="page-header">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mb-2"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-navy-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-navy-700">Operator</span>
                <ChevronDown className="w-4 h-4 text-navy-400" />
              </div>
            </Button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-navy-100 py-1 z-50">
                <div className="px-4 py-2 border-b border-navy-100">
                  <p className="text-sm font-medium text-navy-900">Operator</p>
                  <p className="text-xs text-navy-500">operator@minetrack.com</p>
                </div>
                <button className="w-full px-4 py-2 text-left text-sm text-navy-700 hover:bg-navy-50">
                  Profile
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-navy-700 hover:bg-navy-50">
                  Settings
                </button>
                <hr className="my-1 border-navy-100" />
                <button className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}