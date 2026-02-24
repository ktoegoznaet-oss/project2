'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import AuthGuard from '../../../components/AuthGuard';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiSearch, HiShieldCheck, HiRefresh, HiTrash, HiPlus } from 'react-icons/hi';

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAdmin>
      <UsersManager />
    </AuthGuard>
  );
}

function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api.admin.users()
      .then(data => setUsers(data.users || []))
      .catch(() => toast.error('Ошибка загрузки пользователей'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      await api.admin.updateUser(userId, { role: newRole });
      toast.success('Роль обновлена');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => ({ ...prev, role: newRole }));
      }
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления роли');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleBalanceChange = async (userId, amount) => {
    try {
      await api.admin.updateUser(userId, { balance_add: parseFloat(amount) });
      toast.success(`Баланс обновлён на ${amount > 0 ? '+' : ''}${amount} ₽`);
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, balance: (parseFloat(u.balance) + parseFloat(amount)).toFixed(2) }
        : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => ({
          ...prev,
          balance: (parseFloat(prev.balance) + parseFloat(amount)).toFixed(2)
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления баланса');
    }
  };

  const handleCredentialsChange = async (userId, fields) => {
    try {
      await api.admin.updateUser(userId, fields);
      toast.success('Данные обновлены');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...fields } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => ({ ...prev, ...fields }));
      }
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления');
      throw err;
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Вы уверены? Будут удалены все заказы, платежи и сообщения пользователя.')) return;
    try {
      await api.admin.deleteUser(userId);
      toast.success('Пользователь удалён');
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const handleCreateUser = async (fields) => {
    try {
      const data = await api.admin.createUser(fields);
      toast.success('Пользователь создан');
      setUsers(prev => [data.user, ...prev]);
      setShowCreate(false);
    } catch (err) {
      toast.error(err.message || 'Ошибка создания');
      throw err;
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors = {
    admin: 'text-yellow-400 bg-yellow-600/10 border-yellow-600/30',
    moderator: 'text-blue-400 bg-blue-600/10 border-blue-600/30',
    user: 'text-dark-200 bg-dark-500/50 border-dark-400/30',
  };

  const subscriptionColors = {
    basic: 'text-green-400',
    premium: 'text-purple-400',
    vip: 'text-yellow-400',
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-dark-300 hover:text-white transition">
            <HiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Пользователи ({users.length})</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <HiPlus size={16} /> Создать
          </button>
          <button onClick={loadUsers} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
            <HiRefresh /> Обновить
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="all">Все роли</option>
          <option value="admin">Админы</option>
          <option value="moderator">Модераторы</option>
          <option value="user">Пользователи</option>
        </select>
      </div>

      {/* Users table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-300 border-b border-dark-400">
              <th className="text-left py-3 px-3 font-medium">Пользователь</th>
              <th className="text-left py-3 px-3 font-medium">Email</th>
              <th className="text-left py-3 px-3 font-medium">Роль</th>
              <th className="text-left py-3 px-3 font-medium">Подписка</th>
              <th className="text-right py-3 px-3 font-medium">Баланс</th>
              <th className="text-left py-3 px-3 font-medium">Регистрация</th>
              <th className="text-left py-3 px-3 font-medium">Последняя активность</th>
              <th className="text-center py-3 px-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-dark-500/50 hover:bg-dark-500/30 transition">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{user.username}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-dark-200">{user.email}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${roleColors[user.role] || roleColors.user}`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {user.subscription_type ? (
                    <span className={`font-medium ${subscriptionColors[user.subscription_type] || 'text-dark-200'}`}>
                      {user.subscription_type.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-dark-400">—</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right text-white font-mono">
                  {parseFloat(user.balance).toLocaleString('ru-RU')} ₽
                </td>
                <td className="py-3 px-3 text-dark-300 text-xs">{formatDate(user.created_at)}</td>
                <td className="py-3 px-3 text-dark-300 text-xs">{formatDate(user.last_active)}</td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="text-brand-400 hover:text-brand-300 text-xs font-medium transition"
                  >
                    Управлять
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-dark-300">
            {search || roleFilter !== 'all' ? 'Пользователи не найдены' : 'Нет зарегистрированных пользователей'}
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRoleChange={handleRoleChange}
          onBalanceChange={handleBalanceChange}
          onCredentialsChange={handleCredentialsChange}
          onDelete={handleDeleteUser}
          updatingRole={updatingRole}
        />
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateUser}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onRoleChange, onBalanceChange, onCredentialsChange, onDelete, updatingRole }) {
  const [balanceAmount, setBalanceAmount] = useState('');
  const [credTab, setCredTab] = useState('role'); // 'role' | 'credentials'
  const [credForm, setCredForm] = useState({ username: '', email: '', password: '' });
  const [savingCreds, setSavingCreds] = useState(false);

  const handleSaveCreds = async () => {
    const fields = {};
    if (credForm.username.trim()) fields.username = credForm.username.trim();
    if (credForm.email.trim()) fields.email = credForm.email.trim();
    if (credForm.password) fields.password = credForm.password;
    if (!Object.keys(fields).length) return;
    setSavingCreds(true);
    try {
      await onCredentialsChange(user.id, fields);
      setCredForm({ username: '', email: '', password: '' });
    } catch (_) {
      // error already toasted
    } finally {
      setSavingCreds(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-600 border border-dark-400 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Управление пользователем</h2>
          <button onClick={onClose} className="text-dark-300 hover:text-white text-2xl">&times;</button>
        </div>

        {/* User info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center text-lg font-bold text-white">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{user.username}</p>
              <p className="text-dark-300 text-sm">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-dark-500/50 rounded-lg p-3">
              <p className="text-dark-300 text-xs mb-1">Баланс</p>
              <p className="text-white font-mono font-bold">{parseFloat(user.balance).toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="bg-dark-500/50 rounded-lg p-3">
              <p className="text-dark-300 text-xs mb-1">Подписка</p>
              <p className="text-white font-bold">{user.subscription_type?.toUpperCase() || 'Нет'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-dark-500/50 rounded-xl p-1">
          {[['role', 'Роль и баланс'], ['credentials', 'Данные входа']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCredTab(key)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${credTab === key ? 'bg-dark-600 text-white shadow' : 'text-dark-300 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {credTab === 'role' && (
          <>
            {/* Role change */}
            <div className="mb-6">
              <label className="block text-sm text-dark-200 mb-2">Роль пользователя</label>
              <div className="flex gap-2">
                {['user', 'moderator', 'admin'].map(role => (
                  <button
                    key={role}
                    onClick={() => onRoleChange(user.id, role)}
                    disabled={user.role === role || updatingRole === user.id}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                      user.role === role
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-dark-500/50 border-dark-400 text-dark-200 hover:bg-dark-400 hover:text-white'
                    } ${updatingRole === user.id ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {role === 'admin' && <HiShieldCheck className="inline mr-1" />}
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance management */}
            <div className="mb-6">
              <label className="block text-sm text-dark-200 mb-2">Управление балансом</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Сумма (₽)"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    if (balanceAmount && parseFloat(balanceAmount) !== 0) {
                      onBalanceChange(user.id, balanceAmount);
                      setBalanceAmount('');
                    }
                  }}
                  disabled={!balanceAmount || parseFloat(balanceAmount) === 0}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {parseFloat(balanceAmount || 0) >= 0 ? 'Начислить' : 'Списать'}
                </button>
              </div>
              <p className="text-xs text-dark-400 mt-1">Положительное число — начисление, отрицательное — списание</p>
            </div>
          </>
        )}

        {credTab === 'credentials' && (
          <div className="mb-6 space-y-3">
            <p className="text-xs text-dark-400 mb-3">Заполните только те поля, которые нужно изменить</p>
            <div>
              <label className="block text-xs text-dark-300 mb-1">Новый username</label>
              <input
                type="text"
                placeholder={user.username}
                value={credForm.username}
                onChange={e => setCredForm(p => ({ ...p, username: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-300 mb-1">Новый email</label>
              <input
                type="email"
                placeholder={user.email}
                value={credForm.email}
                onChange={e => setCredForm(p => ({ ...p, email: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-300 mb-1">Новый пароль</label>
              <input
                type="password"
                placeholder="Оставьте пустым, если не меняете"
                value={credForm.password}
                onChange={e => setCredForm(p => ({ ...p, password: e.target.value }))}
                className="input w-full"
              />
            </div>
            <button
              onClick={handleSaveCreds}
              disabled={savingCreds || (!credForm.username.trim() && !credForm.email.trim() && !credForm.password)}
              className="btn-primary w-full text-sm py-2 disabled:opacity-50"
            >
              {savingCreds ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        )}

        {/* Delete button */}
        <div className="mb-4">
          <button
            onClick={() => onDelete(user.id)}
            className="w-full py-2 rounded-lg text-sm font-medium text-red-400 border border-red-600/30 bg-red-600/10 hover:bg-red-600/20 transition flex items-center justify-center gap-2"
          >
            <HiTrash /> Удалить пользователя
          </button>
        </div>

        {/* Info rows */}
        <div className="text-xs text-dark-400 space-y-1 border-t border-dark-400 pt-4">
          <p>ID: {user.id}</p>
          <p>Зарегистрирован: {new Date(user.created_at).toLocaleString('ru-RU')}</p>
          <p>Последняя активность: {user.last_active ? new Date(user.last_active).toLocaleString('ru-RU') : '—'}</p>
          {user.subscription_expires && <p>Подписка до: {new Date(user.subscription_expires).toLocaleString('ru-RU')}</p>}
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate(form);
    } catch (_) {
      // error already toasted
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-600 border border-dark-400 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Создать пользователя</h2>
          <button onClick={onClose} className="text-dark-300 hover:text-white text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-200 mb-1">Username</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              className="input w-full"
              placeholder="Минимум 3 символа"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-200 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-200 mb-1">Пароль</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="input w-full"
              placeholder="Минимум 6 символов"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-200 mb-1">Роль</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="input w-full"
            >
              <option value="user">user</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2">
              Отмена
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2 disabled:opacity-50">
              {saving ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
