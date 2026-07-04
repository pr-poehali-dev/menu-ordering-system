const API = 'https://functions.poehali.dev/63212360-724a-4a4d-8a32-e5beb5ed511a';

export type User = {
  id: number;
  name: string;
  phone: string;
  role: 'client' | 'admin' | 'cashier';
  points: number;
};

async function call(action: string, method: 'GET' | 'POST', payload?: unknown, query?: Record<string, string>) {
  const qs = new URLSearchParams({ action, ...(query || {}) }).toString();
  const res = await fetch(`${API}?${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

export const api = {
  register: (name: string, phone: string, password: string) =>
    call('register', 'POST', { name, phone, password }),
  login: (phone: string, password: string) => call('login', 'POST', { phone, password }),
  order: (payload: Record<string, unknown>) => call('order', 'POST', payload),
  myOrders: (user_id: number) => call('my_orders', 'GET', undefined, { user_id: String(user_id) }),
  adminOrders: () => call('admin_orders', 'GET'),
  checkOrder: (number: string) => call('check_order', 'GET', undefined, { number }),
};

const KEY = 'vz_user';
export const saveUser = (u: User) => localStorage.setItem(KEY, JSON.stringify(u));
export const loadUser = (): User | null => {
  const v = localStorage.getItem(KEY);
  return v ? JSON.parse(v) : null;
};
export const clearUser = () => localStorage.removeItem(KEY);