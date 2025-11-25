import React from 'react';
import { Home, MessageCircle, Grid3x3, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/i18n';

const navItems = [
  { id: 'home', labelKey: 'nav.home', icon: Home, page: 'EunoiaHome' },
  { id: 'chat', labelKey: 'nav.chat', icon: MessageCircle, page: 'EunoiaChat' },
  { id: 'square', labelKey: 'nav.square', icon: Grid3x3, page: 'EunoiaSquare' },
  { id: 'me', labelKey: 'nav.me', icon: User, page: 'EunoiaMe' },
];

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (page) => {
    return location.pathname === createPageUrl(page);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50 safe-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.page);
            
            return (
              <Link
                key={item.id}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-2xl transition-all ${
                  active ? 'text-teal-600 bg-teal-50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-xs font-medium">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
