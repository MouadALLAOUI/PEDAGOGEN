'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Tabs } from '@/components/ui/Tabs';

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    const result = await signUp(email, password, fullName);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push('/');
    }
  };

  const tabs = [
    { value: 'login', label: 'Se connecter' },
    { value: 'register', label: 'Créer un compte' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-navy/10 overflow-hidden">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(v) => setActiveTab(v as 'login' | 'register')} />

      <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="p-8 space-y-5">
        {error && (
          <div className="bg-red/10 border border-red/20 text-red text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {activeTab === 'register' && (
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Nom complet</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-parchment text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                placeholder="Mohamed Alami"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-parchment text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
              placeholder="vous@exemple.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Mot de passe</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-parchment text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        {activeTab === 'register' && (
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Confirmer</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-parchment text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-teal/20"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {activeTab === 'login' ? 'Connexion...' : 'Création...'}
            </>
          ) : (
            <>
              {activeTab === 'login' ? 'Se connecter' : 'Créer mon compte'}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
