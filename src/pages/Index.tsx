import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AuthDialog from '@/components/AuthDialog';
import { api, loadUser, clearUser, User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type Dish = { id: string; name: string; desc: string; price: number; cat: string; tag?: string };
type Place = { id: string; name: string; kind: string; city: string; accent: string; img: string; menu: Dish[] };

const HERO = 'https://cdn.poehali.dev/projects/e8c21d6c-52b3-4665-9666-db95d5f7251b/files/bd0a65da-1896-4a00-b0c6-bf067a3f0c0d.jpg';
const BURGER = 'https://cdn.poehali.dev/projects/e8c21d6c-52b3-4665-9666-db95d5f7251b/files/9f328d7e-c56d-4f66-9276-21a838d1140c.jpg';
const PASTA = 'https://cdn.poehali.dev/projects/e8c21d6c-52b3-4665-9666-db95d5f7251b/files/0a202c88-73f2-45b1-aa48-433795ebd911.jpg';

const PLACES: Place[] = [
  {
    id: 'roasters', name: 'Тёплый Зерно', kind: 'Кофейня', city: 'Москва', accent: '12 78% 52%', img: HERO,
    menu: [
      { id: 'r1', name: 'Капучино', desc: 'Двойной эспрессо, бархатная пена', price: 220, cat: 'Напитки', tag: 'хит' },
      { id: 'r2', name: 'Раф лавандовый', desc: 'Сливки, сироп лаванды', price: 290, cat: 'Напитки' },
      { id: 'r3', name: 'Круассан миндальный', desc: 'Хрустящий, с франжипаном', price: 260, cat: 'Выпечка', tag: 'новинка' },
      { id: 'r4', name: 'Чизкейк Нью-Йорк', desc: 'Классический, с ягодами', price: 340, cat: 'Десерты' },
    ],
  },
  {
    id: 'grill', name: 'Огонь&Хлеб', kind: 'Бургерная', city: 'Санкт-Петербург', accent: '25 90% 50%', img: BURGER,
    menu: [
      { id: 'g1', name: 'Бургер Классик', desc: 'Мраморная говядина, чеддер', price: 490, cat: 'Бургеры', tag: 'хит' },
      { id: 'g2', name: 'Бургер Трюфель', desc: 'Грибной соус, руккола', price: 640, cat: 'Бургеры' },
      { id: 'g3', name: 'Картофель фри', desc: 'С трюфельным маслом', price: 250, cat: 'Гарниры' },
      { id: 'g4', name: 'Лимонад цитрус', desc: 'Свежевыжатый', price: 210, cat: 'Напитки' },
    ],
  },
  {
    id: 'fine', name: 'Верде', kind: 'Ресторан', city: 'Москва', accent: '152 42% 32%', img: PASTA,
    menu: [
      { id: 'f1', name: 'Паста с трюфелем', desc: 'Тальятелле, пармезан 24 мес.', price: 890, cat: 'Основное', tag: 'шеф' },
      { id: 'f2', name: 'Ризотто с белыми грибами', desc: 'Карнароли, выдержанное вино', price: 760, cat: 'Основное' },
      { id: 'f3', name: 'Карпаччо из тунца', desc: 'Понзу, кунжут', price: 680, cat: 'Закуски' },
      { id: 'f4', name: 'Тирамису', desc: 'Маскарпоне, эспрессо', price: 420, cat: 'Десерты' },
    ],
  },
];

type OrderItem = { name: string; qty: number; price: number };
type MyOrder = { order_number: string; place_name: string; total: number; points_earned: number; status: string; created_at: string };
type AdminOrder = MyOrder & { client_name: string; phone: string };

const STATUS_LABEL: Record<string, string> = { new: 'Новый', cooking: 'Готовится', ready: 'Готов', done: 'Выдан' };

const Index = () => {
  const [place, setPlace] = useState<Place | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ order_number: string; total: number; points_earned: number } | null>(null);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [checkNum, setCheckNum] = useState('');
  const [checkResult, setCheckResult] = useState<AdminOrder | null | 'none'>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setUser(loadUser()); }, []);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const remove = (id: string) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1; const copy = { ...c };
      if (n <= 0) delete copy[id]; else copy[id] = n;
      return copy;
    });

  const total = useMemo(() => place ? place.menu.reduce((s, d) => s + (cart[d.id] || 0) * d.price, 0) : 0, [cart, place]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const cats = place ? [...new Set(place.menu.map((d) => d.cat))] : [];

  const logout = () => { clearUser(); setUser(null); toast({ title: 'Вы вышли из аккаунта' }); };

  const checkout = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!place || count === 0) return;
    setLoading(true);
    try {
      const items: OrderItem[] = place.menu.filter((d) => cart[d.id]).map((d) => ({ name: d.name, qty: cart[d.id], price: d.price }));
      const data = await api.order({ user_id: user.id, place_id: place.id, place_name: place.name, items, total });
      setPlacedOrder(data.order);
      setUser({ ...user, points: data.points });
      setCart({});
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCabinet = async () => {
    if (!user) { setAuthOpen(true); return; }
    setCabinetOpen(true);
    try { const data = await api.myOrders(user.id); setMyOrders(data.orders); } catch { /* empty */ }
  };

  const openAdmin = async () => {
    setAdminOpen(true);
    try { const data = await api.adminOrders(); setAdminOrders(data.orders); } catch { /* empty */ }
  };

  const doCheck = async () => {
    if (!checkNum) return;
    try { const data = await api.checkOrder(checkNum); setCheckResult(data.order); }
    catch { setCheckResult('none'); }
  };

  return (
    <div className="min-h-screen grain relative overflow-x-hidden">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => { setPlace(null); setCart({}); }} className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-xl">В</span>
            <span className="font-display text-2xl font-semibold tracking-tight">Вкусно<span className="text-primary">.Здесь</span></span>
          </button>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <Button variant="outline" className="rounded-full gap-2" onClick={openAdmin}>
                <Icon name="Shield" size={18} /><span className="hidden sm:inline">Админ</span>
              </Button>
            )}
            {user ? (
              <>
                <Button variant="ghost" className="rounded-full gap-2" onClick={openCabinet}>
                  <Icon name="Sparkles" size={18} className="text-accent" />
                  <span className="font-semibold">{user.points}</span>
                  <span className="hidden sm:inline text-muted-foreground">баллов</span>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={logout}>
                  <Icon name="LogOut" size={18} />
                </Button>
              </>
            ) : (
              <Button variant="ghost" className="rounded-full gap-2" onClick={() => setAuthOpen(true)}>
                <Icon name="User" size={18} /><span className="hidden sm:inline">Войти</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {!place ? (
        <>
          <section className="relative max-w-6xl mx-auto px-5 pt-16 pb-10">
            <div className="absolute -top-6 right-4 md:right-16 w-40 h-40 md:w-56 md:h-56 rounded-[2.5rem] overflow-hidden rotate-6 shadow-2xl animate-floaty hidden sm:block">
              <img src={PASTA} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-primary font-medium tracking-widest uppercase text-sm animate-rise">Онлайн-заказ · Лояльность · Меню</p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.95] mt-4 max-w-3xl text-balance animate-rise">
              Выбери своё<br />любимое <span className="italic text-primary">место</span> вкуса
            </h1>
            <p className="text-muted-foreground text-lg mt-6 max-w-xl animate-rise" style={{ animationDelay: '0.1s' }}>
              Одна платформа — десятки заведений. Смотри меню без регистрации, а для заказа просто войди в аккаунт.
            </p>
          </section>

          <section className="max-w-6xl mx-auto px-5 pb-24">
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-display text-3xl md:text-4xl font-semibold">Куда заглянем сегодня?</h2>
              <span className="text-muted-foreground text-sm">{PLACES.length} заведения</span>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {PLACES.map((p, i) => (
                <button key={p.id} onClick={() => setPlace(p)}
                  className="group text-left rounded-3xl overflow-hidden bg-card border border-border hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-rise"
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="relative h-52 overflow-hidden">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: `hsl(${p.accent})` }}>{p.kind}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon name="MapPin" size={14} /> {p.city}</div>
                    <h3 className="font-display text-2xl font-semibold mt-1">{p.name}</h3>
                    <div className="mt-4 flex items-center gap-1 font-medium text-primary">
                      Открыть меню <Icon name="ArrowRight" size={18} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-[1fr_340px] gap-8 items-start animate-rise">
          <div>
            <button onClick={() => setPlace(null)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6">
              <Icon name="ChevronLeft" size={18} /> Все заведения
            </button>
            <div className="relative rounded-3xl overflow-hidden h-48 md:h-60 mb-8">
              <img src={place.img} alt={place.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-5 left-5 text-white">
                <p className="uppercase text-xs tracking-widest opacity-90">{place.kind} · {place.city}</p>
                <h1 className="font-display text-4xl md:text-5xl font-semibold">{place.name}</h1>
              </div>
            </div>

            {cats.map((cat) => (
              <div key={cat} className="mb-10">
                <h2 className="font-display text-3xl font-semibold mb-4 flex items-center gap-3">{cat}<span className="flex-1 h-px bg-border" /></h2>
                <div className="space-y-3">
                  {place.menu.filter((d) => d.cat === cat).map((d) => (
                    <div key={d.id} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{d.name}</h3>
                          {d.tag && <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{d.tag}</span>}
                        </div>
                        <p className="text-muted-foreground text-sm mt-0.5">{d.desc}</p>
                        <p className="font-display text-xl font-semibold mt-1">{d.price} ₽</p>
                      </div>
                      {cart[d.id] ? (
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="rounded-full h-9 w-9" onClick={() => remove(d.id)}><Icon name="Minus" size={16} /></Button>
                          <span className="w-5 text-center font-semibold">{cart[d.id]}</span>
                          <Button size="icon" className="rounded-full h-9 w-9" onClick={() => add(d.id)}><Icon name="Plus" size={16} /></Button>
                        </div>
                      ) : (
                        <Button className="rounded-full gap-1" onClick={() => add(d.id)}><Icon name="Plus" size={16} /> В заказ</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-24 bg-card border border-border rounded-3xl p-6">
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2 mb-4"><Icon name="ShoppingBag" size={22} /> Ваш заказ</h2>
            {count === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Пока пусто. Добавьте что-нибудь вкусное из меню 🍽️</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {place.menu.filter((d) => cart[d.id]).map((d) => (
                    <div key={d.id} className="flex justify-between text-sm"><span>{d.name} × {cart[d.id]}</span><span className="font-medium">{d.price * cart[d.id]} ₽</span></div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-display text-2xl font-semibold"><span>Итого</span><span>{total} ₽</span></div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Icon name="Sparkles" size={14} className="text-accent" /> Начислим {Math.floor(total / 20)} баллов</p>
                <Button className="w-full rounded-full mt-4 h-12 text-base gap-2" onClick={checkout} disabled={loading}>
                  {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="ArrowRight" size={18} />}
                  {user ? 'Оформить заказ' : 'Войти и заказать'}
                </Button>
                {!user && <p className="text-xs text-muted-foreground mt-2 text-center">Для заказа потребуется вход в аккаунт</p>}
              </>
            )}
          </aside>
        </section>
      )}

      <footer className="border-t border-border bg-secondary text-secondary-foreground">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <span className="font-display text-3xl font-semibold">Вкусно.Здесь</span>
            <p className="opacity-80 text-sm mt-2 max-w-xs">Платформа заведений с меню, онлайн-заказами и картами лояльности.</p>
          </div>
          <div className="flex gap-8 text-sm opacity-90">
            <div className="space-y-2"><p className="font-semibold">Гостям</p><p>Меню</p><p>Заказ онлайн</p><p>Баллы</p></div>
            <div className="space-y-2"><p className="font-semibold">Бизнесу</p><p>Добавить заведение</p><p>Кабинет админа</p><p>Кассиры</p></div>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} onAuth={setUser} />

      <Dialog open={!!placedOrder} onOpenChange={(v) => !v && setPlacedOrder(null)}>
        <DialogContent className="rounded-3xl max-w-md text-center">
          <div className="py-4">
            <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground grid place-items-center mx-auto mb-4">
              <Icon name="Check" size={32} />
            </div>
            <h2 className="font-display text-3xl font-semibold">Заказ принят!</h2>
            <p className="text-muted-foreground mt-1">Назовите номер на кассе</p>
            <div className="my-6 font-display text-6xl font-semibold text-primary tracking-widest">{placedOrder?.order_number}</div>
            <div className="flex justify-center gap-6 text-sm">
              <div><span className="text-muted-foreground">Сумма</span><p className="font-semibold text-lg">{placedOrder?.total} ₽</p></div>
              <div><span className="text-muted-foreground">Баллы</span><p className="font-semibold text-lg text-accent">+{placedOrder?.points_earned}</p></div>
            </div>
            <Button className="w-full rounded-full mt-6 h-12" onClick={() => { setPlacedOrder(null); setPlace(null); }}>Готово</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cabinetOpen} onOpenChange={setCabinetOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-3xl">Мои заказы</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2 bg-muted rounded-2xl p-4 mb-2">
            <Icon name="Sparkles" size={24} className="text-accent" />
            <div><p className="text-sm text-muted-foreground">Баланс баллов</p><p className="font-display text-2xl font-semibold">{user?.points} ₽</p></div>
          </div>
          <div className="space-y-2 max-h-80 overflow-auto">
            {myOrders.length === 0 ? <p className="text-muted-foreground text-center py-6">Заказов пока нет</p> : myOrders.map((o) => (
              <div key={o.order_number} className="flex justify-between items-center border border-border rounded-2xl p-3">
                <div>
                  <p className="font-semibold">№ {o.order_number} · {o.place_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('ru')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{o.total} ₽</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{STATUS_LABEL[o.status] || o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader><DialogTitle className="font-display text-3xl flex items-center gap-2"><Icon name="Shield" size={26} /> Панель администратора</DialogTitle></DialogHeader>
          <div className="bg-muted rounded-2xl p-4">
            <p className="font-semibold mb-2 flex items-center gap-2"><Icon name="Search" size={18} /> Проверить заказ по номеру</p>
            <div className="flex gap-2">
              <Input placeholder="Номер заказа" value={checkNum} onChange={(e) => setCheckNum(e.target.value)} className="rounded-xl" />
              <Button className="rounded-xl" onClick={doCheck}>Найти</Button>
            </div>
            {checkResult === 'none' && <p className="text-destructive text-sm mt-2">Заказ не найден</p>}
            {checkResult && checkResult !== 'none' && (
              <div className="mt-3 bg-card rounded-xl p-3 text-sm">
                <p className="font-semibold">№ {checkResult.order_number} · {checkResult.place_name}</p>
                <p className="text-muted-foreground">{checkResult.client_name} · {checkResult.phone}</p>
                <p className="font-semibold mt-1">{checkResult.total} ₽ · {STATUS_LABEL[checkResult.status] || checkResult.status}</p>
              </div>
            )}
          </div>
          <p className="font-semibold flex items-center gap-2 mt-2"><Icon name="ClipboardList" size={18} /> Все заказы</p>
          <div className="space-y-2 max-h-72 overflow-auto">
            {adminOrders.length === 0 ? <p className="text-muted-foreground text-center py-4">Заказов пока нет</p> : adminOrders.map((o) => (
              <div key={o.order_number} className="flex justify-between items-center border border-border rounded-2xl p-3 text-sm">
                <div>
                  <p className="font-semibold">№ {o.order_number} · {o.place_name}</p>
                  <p className="text-xs text-muted-foreground">{o.client_name} · {o.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{o.total} ₽</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{STATUS_LABEL[o.status] || o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
