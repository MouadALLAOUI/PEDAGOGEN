'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Monitor, HelpCircle, Sparkles, Settings, CheckCircle, XCircle, Wifi, WifiOff, Terminal } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageTransition } from '@/components/layout/PageTransition';
import type { ProviderId } from '@/lib/ai/types';

const PROVIDERS: {
  id: ProviderId;
  label: string;
  description: string;
  icon: typeof Monitor;
}[] = [
  { id: 'none', label: 'Aucun', description: 'Template uniquement, sans IA', icon: WifiOff },
  { id: 'huggingface', label: 'HuggingFace', description: 'Cloud — API Router', icon: Wifi },
  { id: 'lmstudio', label: 'LM Studio', description: 'Local — OpenAI compatible', icon: Monitor },
  { id: 'opencode', label: 'OpenCode', description: 'Zen — Modèles gratuits', icon: Terminal },
];


export default function SettingsPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderId>('none');
  const [hfToken, setHfToken] = useState('');
  const [lmstudioUrl, setLmstudioUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [lmstudioModel, setLmstudioModel] = useState('local-model');
  const [opencodeModel, setOpencodeModel] = useState('opencode/kimi-k2.5-free');
  const [debugMode, setDebugMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.provider) setProvider(s.provider as ProviderId);
        if (s.huggingface_token) setHfToken(s.huggingface_token);
        if (s.lmstudio_url) setLmstudioUrl(s.lmstudio_url);
        if (s.lmstudio_model) setLmstudioModel(s.lmstudio_model);
        if (s.opencode_model) setOpencodeModel(s.opencode_model);
        if (s.debug_mode === 'true') setDebugMode(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isProviderActive = (id: ProviderId): boolean => {
    if (id === 'none') return true;
    if (id === 'huggingface') return !!hfToken;
    if (id === 'lmstudio') return !!lmstudioUrl;
    if (id === 'opencode') return true;
    return false;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          huggingface_token: hfToken,
          lmstudio_url: lmstudioUrl,
          lmstudio_model: lmstudioModel,
          opencode_model: opencodeModel,
          debug_mode: String(debugMode),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-teal" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Paramètres</h1>
              <p className="text-white/60 text-sm mt-0.5">Configurez le fournisseur d&apos;IA et les options de débogage</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Monitor className="text-teal" size={20} />
              <h2 className="font-display font-semibold text-navy">Fournisseur d&apos;IA</h2>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Provider Tabs */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2.5">Fournisseur actif</span>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => {
                    const active = isProviderActive(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                          provider === p.id
                            ? 'border-teal bg-teal/5 shadow-sm'
                            : 'border-border bg-white hover:border-navy-lighter/40'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          provider === p.id ? 'bg-teal/10 text-teal' : 'bg-parchment-dark text-muted'
                        }`}>
                          <p.icon size={17} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-navy">{p.label}</p>
                          <p className="text-[10px] text-muted leading-tight mt-0.5">{p.description}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {active ? (
                            <CheckCircle size={11} className="text-green" />
                          ) : (
                            <XCircle size={11} className="text-red/60" />
                          )}
                          <span className={`text-[10px] font-medium ${active ? 'text-green' : 'text-red/60'}`}>
                            {active ? 'Configuré' : 'Non configuré'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HuggingFace Settings */}
              {provider === 'huggingface' && (
                <div className="space-y-4">
                  <Input
                    label="Token HuggingFace"
                    type="password"
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    placeholder="hf_..."
                  />
                  <div className="p-3 rounded-lg bg-amber/5 border border-amber/20 flex gap-3 text-xs text-navy/80">
                    <HelpCircle size={16} className="text-amber flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block">Connexion HuggingFace :</span>
                      <p>1. Créez un compte sur <span className="font-mono text-teal">huggingface.co</span></p>
                      <p>2. Générez un token d&apos;accès dans <span className="font-mono text-teal">Settings → Access Tokens</span></p>
                      <p>3. Copiez le token (commence par <span className="font-mono">hf_</span>) et collez-le ci-dessus</p>
                      <p className="text-amber-700 font-medium">401 — Vérifiez que le token est valide et que le compte HuggingFace est actif.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* LM Studio Settings */}
              {provider === 'lmstudio' && (
                <div className="space-y-4">
                  <Input
                    label="URL du serveur LM Studio"
                    type="url"
                    value={lmstudioUrl}
                    onChange={(e) => setLmstudioUrl(e.target.value)}
                    placeholder="http://localhost:1234/v1/chat/completions"
                  />
                  <Input
                    label="Nom du modèle"
                    value={lmstudioModel}
                    onChange={(e) => setLmstudioModel(e.target.value)}
                    placeholder="local-model"
                  />
                  <div className="p-3 rounded-lg bg-amber/5 border border-amber/20 flex gap-3 text-xs text-navy/80">
                    <HelpCircle size={16} className="text-amber flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block">Configuration de LM Studio :</span>
                      <p>1. Activez le serveur local (Local Server) dans LM Studio</p>
                      <p>2. Chargez un modèle et notez son nom exact</p>
                      <p>3. Entrez l&apos;URL du serveur (port par défaut : 1234)</p>
                      <p className="font-medium text-amber-700">4. Augmentez la taille du contexte à au moins 16384 tokens</p>
                    </div>
                  </div>
                </div>
              )}

              {/* OpenCode Settings */}
              {provider === 'opencode' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Modèle OpenCode</span>
                    <select
                      value={opencodeModel}
                      onChange={(e) => setOpencodeModel(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    >
                      <option value="opencode/kimi-k2.5-free">Kimi K2.5 Free (recommandé)</option>
                      <option value="opencode/minimax-m2.5-free">MiniMax M2.5 Free</option>
                      <option value="opencode/big-pickle">Big Pickle (GLM 4.6)</option>
                      <option value="opencode/glm-4.7-free">GLM 4.7 Free</option>
                      <option value="opencode/mimo-v2-pro-free">Mimo V2 Pro Free</option>
                    </select>
                  </div>
                  <div className="p-3 rounded-lg bg-purple/5 border border-purple/20 flex gap-3 text-xs text-navy/80">
                    <Terminal size={16} className="text-purple flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block">OpenCode Zen — Modèles gratuits :</span>
                      <p>1. Ouvrez OpenCode et connectez-vous à Zen pour les modèles gratuits</p>
                      <p>2. Les modèles disponibles varient selon la file d&apos;attente Zen</p>
                      <p>3. Aucune clé API requise — l&apos;authentification OpenCode suffit</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Aucun info */}
              {provider === 'none' && (
                <div className="p-3 rounded-lg bg-parchment-dark border border-border flex gap-3 text-xs text-muted">
                  <HelpCircle size={16} className="text-muted flex-shrink-0 mt-0.5" />
                  <p>Aucun appel API ne sera effectué. Un template Markdown sera généré à la place.</p>
                </div>
              )}

              {/* Debug Mode */}
              <div className={`flex flex-col gap-2 p-4 rounded-xl border transition-all ${provider !== 'none' ? 'bg-parchment-dark/40 border-border opacity-60' : 'bg-parchment-dark border-border'}`}>
                <label className={`flex items-center gap-3 ${provider !== 'none' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => {
                        if (provider === 'none') setDebugMode(e.target.checked);
                      }}
                      disabled={provider !== 'none'}
                      className="sr-only peer"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${debugMode ? 'bg-teal' : 'bg-border'} ${provider !== 'none' ? 'opacity-50' : ''}`} />
                    <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${debugMode ? 'translate-x-5' : ''}`} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy">Mode Débogage</span>
                    <p className="text-xs text-muted">
                      {provider === 'none'
                        ? 'Remplace la réponse IA par le prompt envoyé pour déboguer'
                        : 'Disponible uniquement avec le fournisseur « Aucun »'}
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Enregistrer
                    </>
                  )}
                </Button>
                {saved && (
                  <span className="text-sm text-teal font-medium">Paramètres enregistrés</span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="text-teal" size={20} />
              <h2 className="font-display font-semibold text-navy">Prompts Personnalisés</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Personnalisez les instructions envoyées à l&apos;IA pour chaque type de document.
            </p>
            <Button onClick={() => router.push('/settings/prompts')} variant="secondary" className="w-full">
              Personnaliser les Prompts
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
