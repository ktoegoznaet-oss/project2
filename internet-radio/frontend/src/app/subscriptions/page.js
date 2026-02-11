'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import SubscriptionCard from '../../components/SubscriptionCard';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.subscriptions.list()
      .then(data => setSubscriptions(data.subscriptions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">Подписки</h1>
        <p className="text-dark-300 max-w-xl mx-auto">
          Оформите подписку и получайте скидки на заказы, бесплатные песни каждый месяц и приоритетную очередь.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {subscriptions.map(sub => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              isCurrentPlan={user?.subscription_type === sub.slug}
            />
          ))}
        </div>
      )}

      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Сравнение подписок</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-400">
                <th className="text-left py-3 px-4 text-dark-200 font-medium">Возможность</th>
                <th className="text-center py-3 px-4 text-dark-200 font-medium">Basic</th>
                <th className="text-center py-3 px-4 text-yellow-400 font-medium">Premium</th>
                <th className="text-center py-3 px-4 text-purple-400 font-medium">VIP</th>
              </tr>
            </thead>
            <tbody className="text-dark-100">
              <tr className="border-b border-dark-400/50"><td className="py-3 px-4">Цена/мес</td><td className="py-3 px-4 text-center">199 ₽</td><td className="py-3 px-4 text-center">499 ₽</td><td className="py-3 px-4 text-center">999 ₽</td></tr>
              <tr className="border-b border-dark-400/50"><td className="py-3 px-4">Скидка на заказы</td><td className="py-3 px-4 text-center">10%</td><td className="py-3 px-4 text-center">25%</td><td className="py-3 px-4 text-center">40%</td></tr>
              <tr className="border-b border-dark-400/50"><td className="py-3 px-4">Бесплатные заказы/мес</td><td className="py-3 px-4 text-center">2</td><td className="py-3 px-4 text-center">10</td><td className="py-3 px-4 text-center">30</td></tr>
              <tr className="border-b border-dark-400/50"><td className="py-3 px-4">Приоритетная очередь</td><td className="py-3 px-4 text-center text-dark-300">—</td><td className="py-3 px-4 text-center text-green-400">✓</td><td className="py-3 px-4 text-center text-green-400">✓</td></tr>
              <tr className="border-b border-dark-400/50"><td className="py-3 px-4">Без рекламы</td><td className="py-3 px-4 text-center text-dark-300">—</td><td className="py-3 px-4 text-center text-green-400">✓</td><td className="py-3 px-4 text-center text-green-400">✓</td></tr>
              <tr><td className="py-3 px-4">Скидка на кастомные песни</td><td className="py-3 px-4 text-center text-dark-300">—</td><td className="py-3 px-4 text-center">15%</td><td className="py-3 px-4 text-center">30%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
