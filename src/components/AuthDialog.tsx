import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { api, saveUser, User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuth: (u: User) => void;
};

const AuthDialog = ({ open, onOpenChange, onAuth }: Props) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!phone || !password || (mode === 'register' && !name)) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = mode === 'login' ? await api.login(phone, password) : await api.register(name, phone, password);
      saveUser(data.user);
      onAuth(data.user);
      onOpenChange(false);
      toast({ title: mode === 'login' ? `С возвращением, ${data.user.name}!` : `Добро пожаловать, ${data.user.name}!` });
      setName(''); setPhone(''); setPassword('');
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {mode === 'register' && (
            <Input placeholder="Как вас зовут?" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-12" />
          )}
          <Input placeholder="Телефон или логин" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl h-12" />
          <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl h-12"
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <Button onClick={submit} disabled={loading} className="w-full rounded-full h-12 text-base gap-2">
            {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="LogIn" size={18} />}
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </Button>
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground pt-1"
          >
            {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
