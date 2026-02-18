'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import { HiMusicNote, HiUsers, HiCurrencyDollar, HiClipboardList, HiUpload, HiChartBar } from 'react-icons/hi';

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboard />
    </AuthGuard>
  );
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.dashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24">
      <h1 className="text-3xl font-bold text-white mb-8">Админ-панель</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={<HiUsers />} label="Пользователи" value={dashboard?.users || 0} color="brand" />
        <StatCard icon={<HiMusicNote />} label="Песен" value={dashboard?.songs || 0} color="green" />
        <StatCard icon={<HiClipboardList />} label="Заказов сегодня" value={dashboard?.orders_today || 0} color="yellow" />
        <StatCard icon={<HiCurrencyDollar />} label="Доход/30д" value={`${(dashboard?.revenue_30d || 0).toLocaleString()} ₽`} color="purple" />
        <StatCard icon={<HiUsers />} label="Слушателей" value={dashboard?.active_listeners || 0} color="blue" />
        <StatCard icon={<HiClipboardList />} label="Кастомные" value={dashboard?.pending_custom_orders || 0} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/users" className="card hover:border-brand-500/50 transition group">
          <HiUsers className="text-3xl text-blue-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-bold text-white mb-1">Пользователи</h3>
          <p className="text-sm text-dark-300">Управление пользователями и ролями</p>
        </Link>
        <Link href="/admin/songs" className="card hover:border-brand-500/50 transition group">
          <HiMusicNote className="text-3xl text-purple-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-bold text-white mb-1">Песни</h3>
          <p className="text-sm text-dark-300">Управление каталогом и удаление</p>
        </Link>
        <Link href="/admin/upload" className="card hover:border-brand-500/50 transition group">
          <HiUpload className="text-3xl text-brand-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-bold text-white mb-1">Загрузить песни</h3>
          <p className="text-sm text-dark-300">Drag & drop загрузка аудиофайлов</p>
        </Link>
        <Link href="/admin/orders" className="card hover:border-brand-500/50 transition group">
          <HiClipboardList className="text-3xl text-yellow-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-bold text-white mb-1">Управление заказами</h3>
          <p className="text-sm text-dark-300">Заказы песен и кастомные заказы</p>
        </Link>
        <Link href="/admin/stats" className="card hover:border-brand-500/50 transition group">
          <HiChartBar className="text-3xl text-green-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-bold text-white mb-1">Аналитика</h3>
          <p className="text-sm text-dark-300">Статистика и GPT-аналитик</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    brand: 'text-brand-400 bg-brand-600/10',
    green: 'text-green-400 bg-green-600/10',
    yellow: 'text-yellow-400 bg-yellow-600/10',
    purple: 'text-purple-400 bg-purple-600/10',
    blue: 'text-blue-400 bg-blue-600/10',
    red: 'text-red-400 bg-red-600/10',
  };

  return (
    <div className="card text-center">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 text-xl ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-dark-300">{label}</p>
    </div>
  );
}
