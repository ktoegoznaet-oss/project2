'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import AuthGuard from '../../../components/AuthGuard';
import toast from 'react-hot-toast';

export default function AdminOrdersPage() {
  return (
    <AuthGuard requireAdmin>
      <OrdersContent />
    </AuthGuard>
  );
}

function OrdersContent() {
  const [tab, setTab] = useState('song');
  const [songOrders, setSongOrders] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = filterStatus ? { status: filterStatus } : {};

    if (tab === 'song') {
      api.admin.songOrders(params).then(data => setSongOrders(data.orders)).catch(() => {}).finally(() => setLoading(false));
    } else {
      api.admin.customOrders(params).then(data => setCustomOrders(data.orders)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab, filterStatus]);

  const updateCustomOrder = async (id, updates) => {
    try {
      await api.admin.updateCustomOrder(id, updates);
      toast.success('Заказ обновлён');
      const data = await api.admin.customOrders(filterStatus ? { status: filterStatus } : {});
      setCustomOrders(data.orders);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusLabels = {
    pending: 'Ожидает', paid: 'Оплачен', queued: 'В очереди', playing: 'Играет', played: 'Проиграна',
    cancelled: 'Отменён', new: 'Новый', in_production: 'В работе', review: 'На проверке',
    approved: 'Одобрена', aired: 'В эфире',
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400', paid: 'bg-blue-500/20 text-blue-400',
    queued: 'bg-brand-500/20 text-brand-400', playing: 'bg-green-500/20 text-green-400',
    played: 'bg-dark-400 text-dark-200', cancelled: 'bg-red-500/20 text-red-400',
    new: 'bg-yellow-500/20 text-yellow-400', in_production: 'bg-blue-500/20 text-blue-400',
    review: 'bg-purple-500/20 text-purple-400', approved: 'bg-green-500/20 text-green-400',
    aired: 'bg-green-500/20 text-green-400',
  };

  const songStatuses = ['', 'pending', 'queued', 'playing', 'played', 'cancelled'];
  const customStatuses = ['', 'new', 'paid', 'in_production', 'review', 'approved', 'aired', 'cancelled'];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24">
      <h1 className="text-3xl font-bold text-white mb-8">Управление заказами</h1>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <button onClick={() => { setTab('song'); setFilterStatus(''); }} className={`py-2 px-4 rounded-lg text-sm font-medium transition ${tab === 'song' ? 'bg-brand-600 text-white' : 'bg-dark-600 text-dark-200'}`}>
            Заказы песен
          </button>
          <button onClick={() => { setTab('custom'); setFilterStatus(''); }} className={`py-2 px-4 rounded-lg text-sm font-medium transition ${tab === 'custom' ? 'bg-brand-600 text-white' : 'bg-dark-600 text-dark-200'}`}>
            Кастомные песни
          </button>
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field py-2 text-sm w-auto">
          <option value="">Все статусы</option>
          {(tab === 'song' ? songStatuses : customStatuses).filter(Boolean).map(s => (
            <option key={s} value={s}>{statusLabels[s] || s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'song' ? (
        <div className="space-y-2">
          {songOrders.length === 0 ? (
            <p className="text-dark-300 text-center py-8">Нет заказов</p>
          ) : songOrders.map(o => (
            <div key={o.id} className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-white">{o.title} — {o.artist}</p>
                <p className="text-xs text-dark-300">Заказал: {o.username} | {new Date(o.created_at).toLocaleString('ru-RU')}</p>
                {o.message && <p className="text-xs text-dark-200 italic">"{o.message}"</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[o.status] || ''}`}>
                  {statusLabels[o.status] || o.status}
                </span>
                <span className="text-sm font-medium text-white">{o.price_paid} ₽</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {customOrders.length === 0 ? (
            <p className="text-dark-300 text-center py-8">Нет кастомных заказов</p>
          ) : customOrders.map(o => (
            <div key={o.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-dark-300">{o.username} ({o.email})</p>
                  <p className="text-xs text-dark-300">{new Date(o.created_at).toLocaleString('ru-RU')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[o.status] || ''}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                  <span className="text-sm font-bold text-brand-400">{o.price} ₽</span>
                </div>
              </div>
              <div className="bg-dark-700 rounded-lg p-3 mb-3">
                <p className="text-sm text-dark-100 whitespace-pre-wrap">{o.lyrics}</p>
              </div>
              {o.style_description && <p className="text-sm text-dark-300 mb-2">Стиль: {o.style_description}</p>}
              {o.reference_title && <p className="text-sm text-dark-300 mb-2">Референс: {o.reference_artist} — {o.reference_title}</p>}
              <p className="text-sm text-dark-300 mb-3">Прокруток: {o.aired_count}/{o.air_count}</p>

              <div className="flex flex-wrap gap-2">
                {o.status === 'paid' && (
                  <button onClick={() => updateCustomOrder(o.id, { status: 'in_production' })} className="btn-primary text-xs py-1.5 px-3">В работу</button>
                )}
                {o.status === 'in_production' && (
                  <button onClick={() => updateCustomOrder(o.id, { status: 'review' })} className="btn-primary text-xs py-1.5 px-3">На проверку</button>
                )}
                {o.status === 'review' && (
                  <button onClick={() => updateCustomOrder(o.id, { status: 'approved' })} className="bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-3 rounded-lg transition">Одобрить</button>
                )}
                {!['aired', 'cancelled'].includes(o.status) && (
                  <button onClick={() => updateCustomOrder(o.id, { status: 'cancelled' })} className="btn-danger text-xs py-1.5 px-3">Отменить</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
