'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, Save, Monitor, HelpCircle, Sparkles, Settings, CheckCircle, Wifi, WifiOff, Terminal, Bell, Droplets, FileType, ChevronRight, Zap, BookOpen, Cpu, MessageSquare, Landmark, Plus, Search, Database, Download, Upload, RefreshCw, AlertTriangle, ShieldCheck, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageTransition } from '@/components/layout/PageTransition';
import type { ProviderId } from '@/lib/ai/types';
import { AREF_LIST } from '@/lib/utils/ministerialHeader';
import type { Skill } from '@/types/skills';
import { SkillCard } from '@/components/skills/SkillCard';
import { SkillModal } from '@/components/skills/SkillModal';
import type { DatabaseStats } from '@/lib/db/backup';

const PROVIDERS: {
  id: ProviderId;
  label: string;
  description: string;
  icon: typeof Monitor;
  color: string;
  bgColor: string;
  borderColor: string;
  tag?: string;
}[] = [
  { id: 'none', label: 'Aucun', description: 'Template uniquement', icon: WifiOff, color: 'text-stone-500', bgColor: 'bg-stone-50', borderColor: 'border-stone-200' },
  { id: 'huggingface', label: 'HuggingFace', description: 'Cloud — API Router', icon: Wifi, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', tag: 'Cloud' },
  { id: 'lmstudio', label: 'LM Studio', description: 'Local — OpenAI compatible', icon: Monitor, color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', tag: 'Local' },
  { id: 'opencode', label: 'OpenCode', description: 'Zen — Modèles gratuits', icon: Terminal, color: 'text-teal', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', tag: 'Gratuit' },
];

const TABS = [
  { id: 'provider', label: 'Fournisseur', icon: Cpu },
  { id: 'skills', label: 'Skills & Directives', icon: Sparkles },
  { id: 'prompts', label: 'Prompts', icon: MessageSquare },
  { id: 'preferences', label: 'Préférences', icon: Settings },
  { id: 'database', label: 'Base de données', icon: Database },
] as const;

type TabId = typeof TABS[number]['id'];

function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  description: string;
  icon: typeof Bell;
}) {
  return (
    <label className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${disabled ? 'opacity-50 cursor-not-allowed bg-parchment-dark/30 border-border' : 'cursor-pointer bg-white border-border hover:border-teal/30 hover:shadow-sm'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-teal/10 text-teal' : 'bg-parchment-dark text-muted'}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-navy block">{label}</span>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 rounded-full transition-colors duration-200 bg-stone-200 peer-checked:bg-teal" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('provider');
  const [provider, setProvider] = useState<ProviderId>('none');
  const [hfToken, setHfToken] = useState('');
  const [lmstudioUrl, setLmstudioUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [lmstudioModel, setLmstudioModel] = useState('local-model');
  const [opencodeModel, setOpencodeModel] = useState('opencode/big-pickle');
  const [debugMode, setDebugMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [filigranEnabled, setFiligranEnabled] = useState(true);
  const [defaultFormat, setDefaultFormat] = useState<'pdf' | 'docx'>('pdf');
  const [aref, setAref] = useState('');
  const [directionProvinciale, setDirectionProvinciale] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Skills Management State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<string>('all');
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      toast.error('Erreur lors du chargement des skills');
    } finally {
      setSkillsLoading(false);
    }
  };

  // Database Management State
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbExporting, setDbExporting] = useState<'sqlite' | 'json' | null>(null);
  const [dbImporting, setDbImporting] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);

  const fetchDbStats = async () => {
    setDbLoading(true);
    try {
      const res = await fetch('/api/settings/database');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDbStats(data.stats || null);
    } catch {
      toast.error('Erreur lors du chargement des statistiques de la base');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDbStats();
    }
  }, [activeTab]);

  const handleExport = async (format: 'sqlite' | 'json') => {
    setDbExporting(format);
    try {
      const res = await fetch(`/api/settings/database?export=${format}`);
      if (!res.ok) throw new Error('Échec du téléchargement');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `pedagogen_backup_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} téléchargé avec succès !`, { icon: '💾' });
    } catch {
      toast.error("Erreur lors de l'exportation de la base");
    } finally {
      setDbExporting(null);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImportFile(file);
    setShowImportConfirmModal(true);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!selectedImportFile) return;
    setDbImporting(true);
    const loadingToast = toast.loading('Restauration de la base de données en cours...');

    try {
      const formData = new FormData();
      formData.append('file', selectedImportFile);

      const res = await fetch('/api/settings/database', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la restauration');
      }

      toast.dismiss(loadingToast);
      toast.success(data.message || 'Base de données restaurée avec succès !', { duration: 5000, icon: '🎉' });
      setShowImportConfirmModal(false);
      setSelectedImportFile(null);
      fetchDbStats();

      // Refresh application to reload state and cache
      setTimeout(() => {
        window.location.reload();
      }, 1600);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setDbImporting(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

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
        if (s.notifications_enabled !== 'false') setNotificationsEnabled(true);
        else setNotificationsEnabled(false);
        if (s.filigran_enabled !== 'false') setFiligranEnabled(true);
        else setFiligranEnabled(false);
        if (s.default_format === 'docx') setDefaultFormat('docx');
        if (s.aref) setAref(s.aref);
        if (s.direction_provinciale) setDirectionProvinciale(s.direction_provinciale);
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
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          huggingface_token: hfToken,
          lmstudio_url: lmstudioUrl,
          lmstudio_model: lmstudioModel,
          opencode_model: opencodeModel,
          debug_mode: String(debugMode),
          notifications_enabled: String(notificationsEnabled),
          filigran_enabled: String(filigranEnabled),
          default_format: defaultFormat,
          aref,
          direction_provinciale: directionProvinciale,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
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
      <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Compact Header + Tabs */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy text-white mb-6 shrink-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

          <div className="relative z-10 px-6 pt-5 pb-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Settings size={16} className="text-teal-light" />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight">Paramètres</h1>
            </div>
            <p className="text-white/40 text-xs mb-4">Configurez le fournisseur d&apos;IA, les prompts et les préférences</p>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-white text-navy shadow-sm'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col">
          <div className="flex-1">
            {/* ── Fournisseur Tab ── */}
            {activeTab === 'provider' && (
              <div className="space-y-4 animate-fade-in">
                {/* Provider Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {PROVIDERS.map((p) => {
                    const active = provider === p.id;
                    const configured = isProviderActive(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          active
                            ? `${p.borderColor} ${p.bgColor} shadow-sm`
                            : 'border-border bg-white hover:border-stone-300 hover:shadow-sm'
                        }`}
                      >
                        {active && (
                          <div className="absolute top-3 right-3">
                            <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
                              <CheckCircle size={12} className="text-white" />
                            </div>
                          </div>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? `${p.bgColor} ${p.color}` : 'bg-parchment-dark text-muted'}`}>
                          <p.icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-navy">{p.label}</span>
                            {p.tag && (
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${active ? 'bg-white/60 text-navy/60' : 'bg-parchment-dark text-muted'}`}>
                                {p.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 leading-snug">{p.description}</p>
                          <div className="flex items-center gap-1 mt-2">
                            {configured ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-green" />
                                <span className="text-[10px] font-medium text-green">Prêt</span>
                              </>
                            ) : (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                                <span className="text-[10px] font-medium text-muted">Non configuré</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Provider Config Panel */}
                <div className="rounded-xl border border-border bg-parchment/50 overflow-hidden">
                  {provider === 'huggingface' && (
                    <div className="p-5 space-y-4 animate-fade-in">
                      <Input
                        label="Token HuggingFace"
                        type="password"
                        value={hfToken}
                        onChange={(e) => setHfToken(e.target.value)}
                        placeholder="hf_..."
                      />
                      <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200/60">
                        <div className="flex gap-3 text-xs text-navy/80">
                          <BookOpen size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1.5 leading-relaxed">
                            <span className="font-bold text-amber-800 block">Guide de connexion</span>
                            <p>1. Créez un compte sur <span className="font-mono text-teal font-semibold">huggingface.co</span></p>
                            <p>2. Générez un token dans <span className="font-mono text-teal font-semibold">Settings → Access Tokens</span></p>
                            <p>3. Collez le token ci-dessus</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {provider === 'lmstudio' && (
                    <div className="p-5 space-y-4 animate-fade-in">
                      <Input
                        label="URL du serveur"
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
                      <div className="p-3.5 rounded-lg bg-violet-50 border border-violet-200/60">
                        <div className="flex gap-3 text-xs text-navy/80">
                          <BookOpen size={15} className="text-violet-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1.5 leading-relaxed">
                            <span className="font-bold text-violet-800 block">Configuration LM Studio</span>
                            <p>1. Activez le serveur local dans LM Studio</p>
                            <p>2. Chargez un modèle et notez son nom exact</p>
                            <p>3. Augmentez le contexte à au moins <span className="font-mono font-semibold">16384</span> tokens</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {provider === 'opencode' && (
                    <div className="p-5 space-y-4 animate-fade-in">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Modèle</span>
                        <select
                          value={opencodeModel}
                          onChange={(e) => setOpencodeModel(e.target.value)}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                        >
                          <option value="opencode/kimi-k2.5-free">Kimi K2.5 Free</option>
                          <option value="opencode/minimax-m2.5-free">MiniMax M2.5 Free</option>
                          <option value="opencode/big-pickle">Big Pickle (GLM 4.6)</option>
                          <option value="opencode/glm-4.7-free">GLM 4.7 Free</option>
                          <option value="opencode/mimo-v2-pro-free">Mimo V2 Pro Free</option>
                        </select>
                      </div>
                      <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200/60">
                        <div className="flex gap-3 text-xs text-navy/80">
                          <Zap size={15} className="text-teal flex-shrink-0 mt-0.5" />
                          <div className="space-y-1.5 leading-relaxed">
                            <span className="font-bold text-teal-dark block">OpenCode Zen — Gratuit</span>
                            <p>1. Connectez-vous à Zen dans OpenCode</p>
                            <p>2. Aucune clé API requise</p>
                            <p>3. Les modèles varient selon la file d&apos;attente</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {provider === 'none' && (
                    <div className="p-5 animate-fade-in">
                      <div className="flex gap-3 text-xs text-muted">
                        <HelpCircle size={15} className="flex-shrink-0 mt-0.5" />
                        <p>Aucun appel API ne sera effectué. Un template Markdown sera généré à la place.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debug Mode */}
                <Toggle
                  checked={debugMode}
                  onChange={setDebugMode}
                  disabled={provider !== 'none'}
                  label="Mode Débogage"
                  description={provider === 'none' ? 'Remplace la réponse IA par le prompt envoyé' : 'Disponible uniquement avec « Aucun »'}
                  icon={Terminal}
                />
              </div>
            )}

            {/* ── Skills & Directives Tab ── */}
            {activeTab === 'skills' && (
              <div className="space-y-4 animate-fade-in">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-white">
                  <div>
                    <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                      <Sparkles size={16} className="text-teal" />
                      Directives &amp; Skills Pédagogiques
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Personnalisez les règles de génération pour vos cours, minutages, résolutions de conflits et formats.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingSkill(null);
                      setIsSkillModalOpen(true);
                    }}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Nouveau Skill
                  </Button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Rechercher par nom, matière, leçon ou consigne..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: 'Tous' },
                      { id: 'pedagogy', label: 'Pédagogie' },
                      { id: 'format', label: 'Format' },
                      { id: 'timing', label: 'Minutage' },
                      { id: 'conflict_resolution', label: 'Conflits' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSkillCategoryFilter(f.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                          skillCategoryFilter === f.id
                            ? 'bg-navy text-parchment font-semibold'
                            : 'bg-white border border-border text-navy/70 hover:bg-slate-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skills Grid */}
                {skillsLoading ? (
                  <div className="py-12 text-center text-muted text-xs">
                    <Loader2 size={24} className="animate-spin mx-auto text-teal mb-2" />
                    Chargement des directives...
                  </div>
                ) : (
                  (() => {
                    const filtered = skills.filter((s) => {
                      const matchCat = skillCategoryFilter === 'all' || s.category === skillCategoryFilter;
                      const q = skillSearch.toLowerCase().trim();
                      const matchQuery =
                        !q ||
                        s.name.toLowerCase().includes(q) ||
                        s.description?.toLowerCase().includes(q) ||
                        s.prompt_instruction?.toLowerCase().includes(q) ||
                        s.scope_subject?.toLowerCase().includes(q) ||
                        s.scope_lesson?.toLowerCase().includes(q);
                      return matchCat && matchQuery;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center rounded-xl border border-dashed border-border bg-white">
                          <p className="text-xs text-muted">Aucune directive trouvée pour ces critères.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map((skill) => (
                          <SkillCard
                            key={skill.id}
                            skill={skill}
                            onToggle={async (id) => {
                              try {
                                const res = await fetch(`/api/skills/${id}/toggle`, { method: 'POST' });
                                if (!res.ok) throw new Error();
                                fetchSkills();
                              } catch {
                                toast.error('Échec modification statut');
                              }
                            }}
                            onEdit={(s) => {
                              setEditingSkill(s);
                              setIsSkillModalOpen(true);
                            }}
                            onDelete={async (id) => {
                              if (!confirm('Supprimer ce skill personnalisé ?')) return;
                              try {
                                const res = await fetch(`/api/skills?id=${id}`, { method: 'DELETE' });
                                if (!res.ok) throw new Error();
                                toast.success('Skill supprimé');
                                fetchSkills();
                              } catch {
                                toast.error('Impossible de supprimer');
                              }
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()
                )}

              </div>
            )}

            {/* ── Prompts Tab ── */}
            {activeTab === 'prompts' && (
              <div className="space-y-4 animate-fade-in">
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center shrink-0">
                      <Sparkles size={22} className="text-teal" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-navy">Prompts Personnalisés</h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        Personnalisez les instructions envoyées à l&apos;IA pour chaque type de document.
                        Modifiez les prompts globaux ou spécifiques par type de fiche.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/settings/prompts')}
                    className="w-full mt-4 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-dashed border-teal/30 text-sm font-semibold text-teal hover:bg-teal/5 hover:border-teal/50 transition-all"
                  >
                    <Sparkles size={16} />
                    Ouvrir l&apos;éditeur de prompts
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Fiche Pédagogique', desc: 'Structure de la fiche APC' },
                    { label: 'Planification', desc: 'Séquences semestrielles' },
                    { label: 'Cours Complet', desc: 'Script enseignant détaillé' },
                    { label: 'Évaluation', desc: 'Tests et grilles d\'évaluation' },
                  ].map((item) => (
                    <div key={item.label} className="p-3.5 rounded-xl border border-border bg-white/60">
                      <span className="text-xs font-bold text-navy block">{item.label}</span>
                      <span className="text-[10px] text-muted mt-0.5 block">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Préférences Tab ── */}
            {activeTab === 'preferences' && (
              <div className="space-y-3 animate-fade-in">
                <Toggle
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                  label="Notifications"
                  description="Recevoir une alerte quand la génération est terminée"
                  icon={Bell}
                />

                <Toggle
                  checked={filigranEnabled}
                  onChange={setFiligranEnabled}
                  label="Filigrane"
                  description="Afficher le nom et l&apos;établissement sur les PDF"
                  icon={Droplets}
                />

                <div className="p-4 rounded-xl border border-border bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-parchment-dark flex items-center justify-center shrink-0">
                      <FileType size={18} className="text-muted" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-navy block">Format par défaut</span>
                      <p className="text-xs text-muted mt-0.5">Pour les documents qui supportent le PDF</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {(['pdf', 'docx'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setDefaultFormat(fmt)}
                        className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                          defaultFormat === fmt
                            ? 'border-teal bg-teal/5 shadow-sm text-teal'
                            : 'border-border bg-parchment/50 text-navy/60 hover:border-stone-300 hover:text-navy'
                        }`}
                      >
                        <FileType size={16} />
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* En-tête Officielle MEN */}
                <div className="p-5 rounded-xl border border-teal/20 bg-teal/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                      <Landmark size={18} className="text-teal" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-navy block">
                        En-tête Officielle MEN (Ministère de l&apos;Éducation Nationale)
                      </span>
                      <p className="text-xs text-muted mt-0.5">
                        Apparaît automatiquement en haut des documents PDF et Word exportés (3 colonnes)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">
                        AREF (Académie Régionale)
                      </label>
                      <input
                        type="text"
                        list="settings-aref-list"
                        value={aref}
                        onChange={(e) => setAref(e.target.value)}
                        placeholder="ex: AREF Rabat-Salé-Kénitra"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-navy text-xs focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                      />
                      <datalist id="settings-aref-list">
                        {AREF_LIST.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">
                        Direction Provinciale
                      </label>
                      <input
                        type="text"
                        value={directionProvinciale}
                        onChange={(e) => setDirectionProvinciale(e.target.value)}
                        placeholder="ex: Direction Skhirat-Témara"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-navy text-xs focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BASE DE DONNEES */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                {/* État & Métriques de la base */}
                <div className="p-5 rounded-2xl border border-border bg-white shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">
                        <Database size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                          Base de données locale SQLite
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Opérationnelle
                          </span>
                        </h3>
                        <p className="text-xs text-muted mt-0.5">
                          Fichier local : <code className="font-mono text-teal">data/pedagogen.db</code> (Mode WAL actif)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDbStats}
                      disabled={dbLoading}
                      className="p-2 rounded-lg text-muted hover:text-navy hover:bg-parchment-dark/30 transition-colors"
                      title="Actualiser les métriques"
                    >
                      <RefreshCw size={15} className={dbLoading ? 'animate-spin text-teal' : ''} />
                    </button>
                  </div>

                  {dbLoading && !dbStats ? (
                    <div className="py-8 flex items-center justify-center text-xs text-muted gap-2">
                      <Loader2 size={16} className="animate-spin text-teal" />
                      Calcul des métriques de la base...
                    </div>
                  ) : dbStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="p-3 rounded-xl bg-parchment/40 border border-border">
                        <span className="text-[11px] text-muted block">Élèves enregistrés</span>
                        <span className="text-lg font-bold font-serif text-navy">{dbStats.counts.students}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/40 border border-border">
                        <span className="text-[11px] text-muted block">Classes actives</span>
                        <span className="text-lg font-bold font-serif text-navy">{dbStats.counts.classes}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/40 border border-border">
                        <span className="text-[11px] text-muted block">Séances au carnet</span>
                        <span className="text-lg font-bold font-serif text-navy">{dbStats.counts.notebookEntries}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/40 border border-border">
                        <span className="text-[11px] text-muted block">Évaluations / Contrôles</span>
                        <span className="text-lg font-bold font-serif text-navy">{dbStats.counts.exams}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/40 border border-border">
                        <span className="text-[11px] text-muted block">Documents générés</span>
                        <span className="text-lg font-bold font-serif text-navy">{dbStats.counts.generations}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-parchment/40 border border-border">
                        <span className="text-[11px] text-muted block">Taille sur disque</span>
                        <span className="text-lg font-bold font-serif text-teal">{dbStats.sizeFormatted}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Section Exporter */}
                <div className="p-5 rounded-2xl border border-border bg-white shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Download size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-navy">Exporter la base de données</h3>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">
                        Téléchargez une sauvegarde intégrale de toutes vos classes, élèves, notes, évaluations, cahier de texte et préférences. Idéal pour transférer vos données vers un autre appareil ou archiver votre année scolaire.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <Button
                      type="button"
                      onClick={() => handleExport('sqlite')}
                      disabled={dbExporting !== null}
                      className="flex-1 justify-center gap-2"
                    >
                      {dbExporting === 'sqlite' ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Download size={15} />
                      )}
                      Sauvegarde complète (.sqlite)
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleExport('json')}
                      disabled={dbExporting !== null}
                      className="justify-center gap-2"
                    >
                      {dbExporting === 'json' ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <FileArchive size={15} />
                      )}
                      Export JSON (.json)
                    </Button>
                  </div>
                </div>

                {/* Section Importer / Restaurer */}
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Upload size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-navy">Importer / Restaurer une base de données</h3>
                      <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                        Restaurez un fichier de sauvegarde exporté depuis PEDAGOGEN (<code className="font-mono text-xs">.sqlite</code>, <code className="font-mono text-xs">.db</code> ou <code className="font-mono text-xs">.json</code>).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Attention avant restauration :</span>
                      L&apos;importation remplacera vos données actuelles. Une copie de sécurité de votre base actuelle sera créée automatiquement avant toute modification.
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-300 hover:border-amber-400 bg-white/70 hover:bg-white p-6 rounded-xl cursor-pointer transition-all">
                      <Upload size={24} className="text-amber-600 mb-2" />
                      <span className="text-xs font-semibold text-navy">
                        Cliquez pour sélectionner un fichier de sauvegarde
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">
                        Formats acceptés : .sqlite, .db, .json (max 50 Mo)
                      </span>
                      <input
                        type="file"
                        accept=".sqlite,.db,.json"
                        onChange={handleFileSelected}
                        disabled={dbImporting}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Sauvegardes de sécurité automatiques récentes */}
                {dbStats?.backups && dbStats.backups.length > 0 && (
                  <div className="p-5 rounded-2xl border border-border bg-white shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-teal" />
                      <h3 className="text-sm font-bold text-navy">Sauvegardes de sécurité automatiques</h3>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Copies créées automatiquement sur le serveur dans <code className="font-mono text-teal">data/backups/</code> avant chaque restauration :
                    </p>
                    <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-parchment/20">
                      {dbStats.backups.map((b) => (
                        <div key={b.filename} className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors">
                          <div className="flex items-center gap-2.5">
                            <FileArchive size={14} className="text-muted" />
                            <div>
                              <span className="font-mono font-medium text-navy block text-[11px]">{b.filename}</span>
                              <span className="text-[10px] text-muted">
                                {new Date(b.createdAt).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-muted px-2 py-0.5 rounded bg-white border border-border">
                            {b.sizeFormatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Save Bar (masquée sur l'onglet base de données où les actions sont autonomes) */}
          {activeTab !== 'database' && (
            <div className="flex items-center gap-3 pt-5 pb-2 mt-4 border-t border-border/50 shrink-0">
              <Button type="submit" disabled={saving} size="lg" className="min-w-[180px]">
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle size={16} />
                    Enregistré
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Enregistrer
                  </>
                )}
              </Button>
              {saved && (
                <span className="text-sm text-teal font-medium animate-fade-in">Paramètres enregistrés</span>
              )}
            </div>
          )}
        </form>

        {/* Modal Confirmation Restauration Base */}
        <Modal
          open={showImportConfirmModal}
          onClose={() => {
            if (!dbImporting) {
              setShowImportConfirmModal(false);
              setSelectedImportFile(null);
            }
          }}
          title="Confirmer la restauration de la base"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold mb-1">Remplacement complet des données locales :</p>
                Vous vous apprêtez à restaurer la base de données avec le fichier :
                <div className="mt-2 p-2 rounded bg-white font-mono text-[11px] text-navy border border-amber-200">
                  📄 {selectedImportFile?.name} ({selectedImportFile?.size ? (selectedImportFile.size / 1024).toFixed(1) : 0} Ko)
                </div>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Une copie de sécurité automatique de votre base actuelle sera créée dans le dossier <code className="font-mono text-teal">data/backups/</code> avant l&apos;application des modifications.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowImportConfirmModal(false);
                  setSelectedImportFile(null);
                }}
                disabled={dbImporting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={dbImporting}
                className="bg-amber-600 hover:bg-amber-700 text-white border-transparent"
              >
                {dbImporting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Restauration en cours...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Confirmer la restauration
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Edition / Ajout Skill (placée hors du form pour éviter imbrication HTML invalide) */}
        <SkillModal
          isOpen={isSkillModalOpen}
          onClose={() => {
            setIsSkillModalOpen(false);
            setEditingSkill(null);
          }}
          editingSkill={editingSkill}
          onSave={async (payload) => {
            try {
              const isEdit = Boolean('id' in payload && payload.id);
              const res = await fetch('/api/skills', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error();
              toast.success(isEdit ? 'Skill mis à jour !' : 'Nouveau skill créé !');
              fetchSkills();
            } catch {
              toast.error('Erreur lors de la sauvegarde du skill');
            }
          }}
        />
      </div>
    </PageTransition>
  );
}
