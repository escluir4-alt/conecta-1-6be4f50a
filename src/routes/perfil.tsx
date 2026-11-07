import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type ChangeEvent } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Camera,
  Check,
  ChevronRight,
  Database,
  Eye,
  Globe,
  KeyRound,
  Lock,
  Moon,
  Plus,
  ShieldCheck,
  SunMedium,
  UserRound,
} from 'lucide-react';
import { AppShell, useRequireUser } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const TABS = [
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'configuracao', label: 'Configuração' },
  { id: 'sistema', label: 'Sistema' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type CustomField = {
  id: number;
  label: string;
  value: string;
};

type SidebarLink = {
  id: string;
  label: string;
  enabled: boolean;
};

export const Route = createFileRoute('/perfil')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Perfil — Axion' },
      { name: 'description', content: 'Perfil, configuração e sistema da conta.' },
      { property: 'og:title', content: 'Perfil — Axion' },
      { property: 'og:description', content: 'Perfil, configuração e sistema da conta.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const user = useRequireUser();
  const [activeTab, setActiveTab] = useState<TabId>('cadastro');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: user?.name ?? 'Valdemiro Nascimento',
    email: user?.email ?? 'valdemiro.human@gmail.com',
    phone: '(11) 99999-0000',
    address: 'Rua das Flores, 123',
    cep: '01000-000',
    city: 'São Paulo',
    state: 'SP',
    rg: '12.345.678-9',
    cpf: '123.456.789-09',
    password: '',
    passwordConfirm: '',
  });

  const [customFields, setCustomFields] = useState<CustomField[]>([
    { id: 1, label: 'Contato alternativo', value: '(11) 98888-1111' },
    { id: 2, label: 'Empresa', value: 'Axion' },
  ]);

  const [sidebarLinks, setSidebarLinks] = useState<SidebarLink[]>([
    { id: 'receitas', label: 'Receitas', enabled: true },
    { id: 'despesas', label: 'Despesas', enabled: true },
    { id: 'agenda', label: 'Agenda', enabled: true },
    { id: 'perfil', label: 'Perfil', enabled: true },
  ]);

  const moveLink = (index: number, direction: -1 | 1) => {
    setSidebarLinks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;

      const a = next[index];
      const b = next[target];

      if (a && b) {
        next[index] = b;
        next[target] = a;
      }

      return next;
    });
  };

  const addCustomField = () => {
    setCustomFields((current) => [...current, { id: Date.now(), label: 'Novo campo', value: '' }]);
  };

  const updateCustomField = (id: number, key: 'label' | 'value', value: string) => {
    setCustomFields((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const renderCadastro = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 rounded-3xl border bg-card p-5 shadow-soft md:flex-row md:items-center">
        <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-muted text-muted-foreground transition hover:border-primary hover:text-primary">
          {avatar ? <img src={avatar} alt="Foto de perfil" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8" />}
          <input type="file" accept="image/*" className="sr-only" onChange={onAvatarChange} />
          <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </label>

        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input id="profile-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-phone">Telefone</Label>
          <Input id="profile-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-address">Endereço</Label>
          <Input id="profile-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-cep">CEP</Label>
          <Input id="profile-cep" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-city">Cidade</Label>
          <Input id="profile-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-state">Estado</Label>
          <Input id="profile-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-rg">RG</Label>
          <Input id="profile-rg" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="profile-cpf">CPF</Label>
          <Input id="profile-cpf" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Senha</h3></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-password">Nova senha</Label>
            <Input id="profile-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-password-confirm">Confirmar senha</Label>
            <Input id="profile-password-confirm" type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} placeholder="••••••••" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Campos personalizados</h3>
          <Button type="button" variant="outline" size="sm" onClick={addCustomField}><Plus className="mr-1 h-4 w-4" />Adicionar campo</Button>
        </div>

        <div className="space-y-3">
          {customFields.map((field) => (
            <div key={field.id} className="grid gap-2 rounded-2xl border bg-muted/30 p-3 md:grid-cols-[1fr_1.3fr]">
              <Input value={field.label} onChange={(e) => updateCustomField(field.id, 'label', e.target.value)} aria-label="Nome do campo" />
              <Input value={field.value} onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} aria-label="Valor do campo" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConfiguracao = () => (
    <div className="space-y-6">
      <Link to="/configuracoes/open-finance" className="flex items-center justify-between gap-3 rounded-3xl border bg-card p-5 shadow-soft transition hover:border-primary/30 hover:bg-muted/30">
        <span className="flex items-center gap-3"><KeyRound className="size-5 text-primary"/><span><strong className="block">Open Finance · Meu Pluggy</strong><span className="text-xs text-muted-foreground">Gerenciar Client ID e Client Secret de duas contas independentes</span></span></span><ChevronRight className="size-5 text-muted-foreground"/>
      </Link>
      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><SunMedium className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Tema</h3></div>
        <div className="flex flex-wrap gap-3">
          {(['light', 'dark'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                theme === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {option === 'light' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {option === 'light' ? 'Claro' : 'Escuro'}
              {theme === option && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Ajuste de aparência da área do perfil e do painel principal.</p>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Backup e restauração</h3></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Button type="button" variant="outline" className="justify-start" onClick={() => window.alert('Backup solicitado.')}> 
            <span className="inline-flex items-center gap-2"><Database className="h-4 w-4" /> Fazer backup</span>
          </Button>
          <Button type="button" variant="outline" className="justify-start" onClick={() => window.alert('Restauração do backup iniciada.')}> 
            <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" /> Restaurar backup</span>
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><ChevronRight className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Menu lateral</h3></div>
        <div className="space-y-2">
          {sidebarLinks.map((link, index) => (
            <div key={link.id} className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-3">
              <div className="flex flex-1 items-center justify-between gap-3">
                <span className="font-medium">{link.label}</span>
                <Switch checked={link.enabled} onCheckedChange={(value) => setSidebarLinks((current) => current.map((item) => (item.id === link.id ? { ...item, enabled: Boolean(value) } : item)))} />
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => moveLink(index, -1)} disabled={index === 0} aria-label={`Mover ${link.label} para cima`}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => moveLink(index, 1)} disabled={index === sidebarLinks.length - 1} aria-label={`Mover ${link.label} para baixo`}><ArrowDown className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSistema = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Segurança e acesso</h3></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Button type="button" variant="outline" className="justify-start" onClick={() => window.alert('Redefinição de senha iniciada.') }>
            <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" /> Redefinir senha</span>
          </Button>
          <Button type="button" variant="outline" className="justify-start" onClick={() => window.alert('Conexão com Google será configurada.') }>
            <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" /> Cadastrar/alterar conta Google</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell active="perfil" user={user}>
      <div className={`min-h-[80vh] p-6 lg:p-8 ${theme === 'dark' ? 'bg-slate-950 text-slate-50' : 'bg-background text-foreground'}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 rounded-3xl border bg-card/80 p-5 shadow-soft backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
                  {avatar ? <img src={avatar} alt="Foto de perfil" className="h-full w-full rounded-full object-cover" /> : <UserRound className="h-7 w-7" />}
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight">{form.name}</div>
                  <div className="text-sm text-muted-foreground">{form.email}</div>
                </div>
              </div>
              <div className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Conta ativa
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 rounded-full border bg-card p-1 shadow-soft">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id ? 'bg-brand text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'cadastro' && renderCadastro()}
          {activeTab === 'configuracao' && renderConfiguracao()}
          {activeTab === 'sistema' && renderSistema()}
        </div>
      </div>
    </AppShell>
  );
}
