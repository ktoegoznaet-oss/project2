'use client';

import Link from 'next/link';
import { HiCheckCircle } from 'react-icons/hi';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="card text-center max-w-md w-full">
        <HiCheckCircle className="text-green-400 text-6xl mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Оплата прошла успешно!</h1>
        <p className="text-dark-300 mb-6">Ваш баланс обновлён. Можете заказывать песни!</p>
        <div className="flex gap-3 justify-center">
          <Link href="/catalog" className="btn-primary">Каталог песен</Link>
          <Link href="/profile" className="btn-secondary">Личный кабинет</Link>
        </div>
      </div>
    </div>
  );
}
