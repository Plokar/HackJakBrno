import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  HomeIcon, 
  CalendarIcon, 
  UserGroupIcon,
  DocumentChartBarIcon,
  CogIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

export default function Layout({ children, currentUser }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, current: router.pathname === '/' },
    { name: 'Kalendář operací', href: '/calendar', icon: CalendarIcon, current: router.pathname === '/calendar' },
    { name: 'Pacienti', href: '/patients', icon: UserGroupIcon, current: router.pathname === '/patients' },
    { name: 'Personál', href: '/staff', icon: UserCircleIcon, current: router.pathname === '/staff' },
    { name: 'Reporty', href: '/reports', icon: DocumentChartBarIcon, current: router.pathname === '/reports' },
    { name: 'Nastavení', href: '/settings', icon: CogIcon, current: router.pathname === '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={classNames(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-800">
          <div className="flex items-center">
            <div className="text-white">
              <h1 className="text-xl font-bold">Medic Hub</h1>
              <p className="text-xs text-blue-100">FN u sv. Anny</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    item.current
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <UserCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentUser?.role || 'Administrátor'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={classNames(
        'transition-all duration-300',
        sidebarOpen ? 'lg:pl-64' : 'pl-0'
      )}>
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6">
              <QuickStat label="Aktivní operace" value="3" color="blue" />
              <QuickStat label="Volné sály" value="7" color="green" />
              <QuickStat label="Využití" value="65%" color="yellow" />
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Notifications Panel */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setNotificationsOpen(false)}></div>
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-xl">
            <div className="h-full flex flex-col">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Upozornění</h2>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-gray-500 text-center py-8">
                  Žádná nová upozornění
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value, color }) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}
