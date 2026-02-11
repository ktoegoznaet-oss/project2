'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Добро пожаловать!');
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Вход</h1>
        <p className="text-dark-300 text-center mb-8">Войдите, чтобы заказывать песни и общаться в чате</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-200 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm text-dark-200 mb-1">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-40">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-dark-300 mt-6">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 transition">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
