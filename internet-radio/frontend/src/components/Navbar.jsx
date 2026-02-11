'use client';

import Link from 'next/link';
import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { HiMenu, HiX, HiUser, HiLogout, HiMusicNote, HiCreditCard, HiShieldCheck } from 'react-icons/hi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-400/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
            <HiMusicNote className="text-white text-sm" />
          </div>
          <span className="text-lg font-bold text-white">RadioWave</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/catalog" className="text-dark-100 hover:text-white transition text-sm font-medium">Каталог</Link>
          <Link href="/subscriptions" className="text-dark-100 hover:text-white transition text-sm font-medium">Подписки</Link>
          <Link href="/custom-order" className="text-dark-100 hover:text-white transition text-sm font-medium">Своя песня</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-dark-500 hover:bg-dark-400 rounded-lg px-3 py-2 transition"
              >
                <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-sm text-dark-50">{user.username}</span>
                <span className="text-xs text-brand-400 font-mono">{parseFloat(user.balance).toFixed(0)} ₽</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-dark-600 border border-dark-400 rounded-xl shadow-xl py-2 z-50">
                  <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-100 hover:bg-dark-500 transition">
                    <HiUser className="text-brand-400" /> Личный кабинет
                  </Link>
                  <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-100 hover:bg-dark-500 transition">
                    <HiCreditCard className="text-brand-400" /> Баланс: {parseFloat(user.balance).toFixed(0)} ₽
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-100 hover:bg-dark-500 transition">
                      <HiShieldCheck className="text-yellow-400" /> Админка
                    </Link>
                  )}
                  <hr className="border-dark-400 my-1" />
                  <button onClick={() => { logout(); setProfileOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-dark-500 transition w-full">
                    <HiLogout /> Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-secondary text-sm py-2 px-4">Войти</Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-4">Регистрация</Link>
            </div>
          )}
        </div>

        <button className="md:hidden text-dark-100" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-dark-700 border-t border-dark-400 px-4 py-4 space-y-3">
          <Link href="/catalog" onClick={() => setMenuOpen(false)} className="block text-dark-100 hover:text-white py-2">Каталог</Link>
          <Link href="/subscriptions" onClick={() => setMenuOpen(false)} className="block text-dark-100 hover:text-white py-2">Подписки</Link>
          <Link href="/custom-order" onClick={() => setMenuOpen(false)} className="block text-dark-100 hover:text-white py-2">Своя песня</Link>
          {user ? (
            <>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="block text-dark-100 hover:text-white py-2">Профиль ({parseFloat(user.balance).toFixed(0)} ₽)</Link>
              {user.role === 'admin' && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block text-yellow-400 hover:text-yellow-300 py-2">Админка</Link>}
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block text-red-400 py-2">Выйти</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-secondary text-sm py-2 px-4 flex-1 text-center">Войти</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm py-2 px-4 flex-1 text-center">Регистрация</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
