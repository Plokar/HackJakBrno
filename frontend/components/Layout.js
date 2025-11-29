import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRole } from '../lib/RoleContext';
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
  const { currentRole, changeRole, isDoctor, isAdmin, isNurse } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setHasMounted(true);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeUser, setActiveUser] = useState({
    name: 'Dr. Novák',
    role: 'doctor',
    roleLabel: 'Doktor',
    avatar: '👨‍⚕️'
  });

  const availableUsers = [
    { name: 'Dr. Novák', role: 'doctor', roleLabel: 'Doktor', avatar: '👨‍⚕️' },
    { name: 'Admin Svobodová', role: 'admin', roleLabel: 'Administrátor', avatar: '👨‍💼' },
    { name: 'Sestra Dvořáková', role: 'nurse', roleLabel: 'Zdravotní sestra', avatar: '👩‍⚕️' }
  ];

  const handleUserSwitch = (user) => {
    setActiveUser(user);
    setUserMenuOpen(false);
    changeRole(user.role); // Změna role v kontextu
    console.log('Přepnuto na roli:', user.role);
  };

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
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-[#C21533] to-[#8f0f26]">
          <div className="flex items-center">
            <div className="text-white">
              <h1 className="text-xl font-bold">Medic Hub</h1>
              <p className="text-xs text-red-100">FN u sv. Anny</p>
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
                      ? 'bg-red-50 text-[#C21533]'
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
          {/* User Switch Menu - umístěno nad tlačítko */}
          {userMenuOpen && (
            <div className="mb-2 py-2 bg-white border-2 rounded-lg shadow-lg max-w-xs" style={{ borderColor: '#E00034' }}>
              {availableUsers.map((user) => (
                <button
                  key={user.name}
                  onClick={() => handleUserSwitch(user)}
                  className={`w-full flex items-start px-3 py-2 text-sm transition-colors ${
                    activeUser.name === user.name ? 'bg-[#fce7ed]' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl mr-3 mt-0.5">{user.avatar}</span>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.roleLabel}</p>
                  </div>
                  {activeUser.name === user.name && (
                    <svg className="w-4 h-4 ml-2 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#E00034' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          <div 
            className="flex items-center cursor-pointer hover:bg-red-50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="rounded-full p-2 mr-3 text-xl" style={{ backgroundColor: '#fce7ed' }}>
              {activeUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activeUser.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {activeUser.roleLabel}
              </p>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-0' : 'rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
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
              <div className="hidden sm:flex items-center text-black font-mono text-3xl font-bold min-w-[9ch] justify-end">
                {hasMounted ? formatTime(currentTime) : '--:--:--'}
              </div>
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
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-black">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}
