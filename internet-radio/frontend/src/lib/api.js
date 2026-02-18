// Relative path — works on any domain. Nginx proxies /api → backend:3000
const API_URL = '/api';

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('radio_token');
};

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
};

const uploadFile = async (endpoint, formData) => {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
};

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
  },
  songs: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/songs?${qs}`);
    },
    genres: () => request('/songs/genres'),
    get: (id) => request(`/songs/${id}`),
    upload: (formData) => uploadFile('/songs/upload', formData),
  },
  orders: {
    song: (body) => request('/orders/song', { method: 'POST', body: JSON.stringify(body) }),
    customSong: (body) => request('/orders/custom-song', { method: 'POST', body: JSON.stringify(body) }),
    my: () => request('/orders/my'),
    price: (params) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/orders/price?${qs}`);
    },
  },
  payments: {
    create: (body) => request('/payments/create', { method: 'POST', body: JSON.stringify(body) }),
    history: () => request('/payments/history'),
  },
  subscriptions: {
    list: () => request('/subscriptions'),
    purchase: (body) => request('/subscriptions/purchase', { method: 'POST', body: JSON.stringify(body) }),
    my: () => request('/subscriptions/my'),
  },
  chat: {
    history: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/chat/history?${qs}`);
    },
  },
  stream: {
    nowPlaying: () => request('/stream/now-playing'),
    stats: () => request('/stream/stats'),
  },
  admin: {
    dashboard: () => request('/admin/dashboard'),
    customOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/custom-orders?${qs}`);
    },
    updateCustomOrder: (id, body) => request(`/admin/custom-orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    songOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/song-orders?${qs}`);
    },
    users: () => request('/admin/users'),
    updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    songs: () => request('/admin/songs'),
    deleteSong: (id) => request(`/admin/songs/${id}`, { method: 'DELETE' }),
    stats: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/stats?${qs}`);
    },
  },
};
