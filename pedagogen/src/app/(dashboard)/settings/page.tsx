'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Monitor, HelpCircle, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';

export default function SettingsPage() {
  const router = useRouter();
  const [useLocalModel, setUseLocalModel] = useState(false);
  const [localModelName, setLocalModelName] = useState('google/gemma-4-e2b');
  const [localModelUrl, setLocalModelUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [localApiType, setLocalApiType] = useState<'openai' | 'custom'>('openai');
  const [debugMode, setDebugMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isLocal = localStorage.getItem('pedagogen_use_local_model') === 'true';
    const name = localStorage.getItem('pedagogen_local_model_name') || 'google/gemma-4-e2b';
    const type = (localStorage.getItem('pedagogen_local_api_type') as 'openai' | 'custom') || 'openai';
    const defaultUrl = type === 'openai' ? 'http://localhost:1234/v1/chat/completions' : 'http://localhost:1234/api/v1/chat';
    const url = localStorage.getItem('pedagogen_local_model_url') || defaultUrl;
    const isDebug = localStorage.getItem('pedagogen_debug_mode') === 'true';

    setUseLocalModel(isLocal);
    setLocalModelName(name);
    setLocalApiType(type);
    setLocalModelUrl(url);
    setDebugMode(isDebug);
    setLoading(false);
  }, []);

  const handleApiTypeChange = (type: 'openai' | 'custom') => {
    setLocalApiType(type);
    if (type === 'openai') {
      setLocalModelUrl('http://localhost:1234/v1/chat/completions');
    } else {
      setLocalModelUrl('http://localhost:1234/api/v1/chat');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      localStorage.setItem('pedagogen_use_local_model', String(useLocalModel));
      localStorage.setItem('pedagogen_local_model_name', localModelName);
      localStorage.setItem('pedagogen_local_model_url', localModelUrl);
      localStorage.setItem('pedagogen_local_api_type', localApiType);
      localStorage.setItem('pedagogen_debug_mode', String(debugMode));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
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
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Paramètres</h1>
          <p className="text-sm text-muted mt-1">Configurez l&apos;intégration de vos modèles d&apos;IA et consignes</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="text-teal" size={20} />
              <h2 className="font-display font-semibold text-navy">Personnalisation des Prompts</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Personnalisez les instructions envoyées à l&apos;IA pour chaque document pédagogique. Intégrez des profils d&apos;élèves pré-configurés (niveau, comportement, culture sociale) pour adapter les contenus générés.
            </p>
            <Button onClick={() => router.push('/settings/prompts')} variant="secondary" className="w-full">
              Personnaliser les Prompts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Monitor className="text-teal" size={20} />
              <h2 className="font-display font-semibold text-navy">Modèle Local (LM Studio)</h2>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Debug Mode Toggle */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-navy-light/5 border border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => setDebugMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 rounded-full bg-border peer-checked:bg-teal transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy">Activer le mode Débogage (Voir les Prompts)</span>
                    <p className="text-xs text-muted">Remplace la réponse de l&apos;IA par le prompt envoyé pour voir la structure et déboguer le prompt de chaque fichier</p>
                  </div>
                </label>
              </div>

              {/* Local Mode Toggle */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-navy-light/5 border border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useLocalModel}
                      onChange={(e) => setUseLocalModel(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 rounded-full bg-border peer-checked:bg-teal transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy">Activer le modèle local (LM Studio)</span>
                    <p className="text-xs text-muted">Bascule de l&apos;API HuggingFace vers votre instance locale d&apos;LM Studio</p>
                  </div>
                </label>
              </div>

              {useLocalModel && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      Type d&apos;API locale
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-navy cursor-pointer">
                        <input
                          type="radio"
                          name="localApiType"
                          value="openai"
                          checked={localApiType === 'openai'}
                          onChange={() => handleApiTypeChange('openai')}
                          className="accent-teal"
                        />
                        <span>OpenAI-Compatible (Streaming Temps Réel)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-navy cursor-pointer">
                        <input
                          type="radio"
                          name="localApiType"
                          value="custom"
                          checked={localApiType === 'custom'}
                          onChange={() => handleApiTypeChange('custom')}
                          className="accent-teal"
                        />
                        <span>Custom API (Non-Streaming)</span>
                      </label>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {localApiType === 'openai' 
                        ? "Recommandé. Permet de lire et d'afficher le raisonnement et le texte en direct (sans attente)."
                        : "Format curl personnalisé. Nécessite d'attendre la génération complète avant l'affichage."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      Nom du modèle local
                    </label>
                    <input
                      type="text"
                      value={localModelName}
                      onChange={(e) => setLocalModelName(e.target.value)}
                      placeholder="google/gemma-4-e2b"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                    />
                    <p className="text-xs text-muted mt-1">Indiquez l&apos;identifiant ou le chemin exact configuré dans LM Studio.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      URL de l&apos;API locale
                    </label>
                    <input
                      type="url"
                      value={localModelUrl}
                      onChange={(e) => setLocalModelUrl(e.target.value)}
                      placeholder="http://localhost:1234/v1/chat/completions"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                    />
                    <p className="text-xs text-muted mt-1">URL complète du serveur local LM Studio.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-gold/5 border border-gold/20 flex gap-3 text-xs text-navy/80">
                    <HelpCircle size={16} className="text-gold flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold block">Configuration de LM Studio :</span>
                      <p>1. Activez le serveur local (Local Server) dans LM Studio, et assurez-vous que le port correspond.</p>
                      <p className="font-medium text-amber-700">2. IMPORTANT : Dans les paramètres de LM Studio (panneau de droite du modèle chargé), augmentez la taille du contexte (Context Length / n_ctx) à au moins 16384 ou 32768. La génération de documents avec références dépasse la taille par défaut de 5120 tokens.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="btn-gradient">
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Enregistrer les paramètres
                    </>
                  )}
                </Button>
                {saved && (
                  <span className="text-sm text-teal font-medium">✓ Paramètres enregistrés</span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
