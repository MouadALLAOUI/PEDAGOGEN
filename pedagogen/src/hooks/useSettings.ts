'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProviderId } from '@/lib/ai/types';

interface ProviderSettingsState {
  provider: ProviderId;
  hfToken: string;
  lmstudioUrl: string;
  lmstudioModel: string;
  opencodeModel: string;
  debugMode: boolean;
}

const DEFAULTS: ProviderSettingsState = {
  provider: 'none',
  hfToken: '',
  lmstudioUrl: 'http://localhost:1234/v1/chat/completions',
  lmstudioModel: 'local-model',
  opencodeModel: 'opencode/kimi-k2.5-free',
  debugMode: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<ProviderSettingsState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        setSettings({
          provider: s.provider || DEFAULTS.provider,
          hfToken: s.huggingface_token || DEFAULTS.hfToken,
          lmstudioUrl: s.lmstudio_url || DEFAULTS.lmstudioUrl,
          lmstudioModel: s.lmstudio_model || DEFAULTS.lmstudioModel,
          opencodeModel: s.opencode_model || DEFAULTS.opencodeModel,
          debugMode: s.debug_mode === 'true',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(async (partial: Partial<ProviderSettingsState>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          huggingface_token: settings.hfToken,
          lmstudio_url: settings.lmstudioUrl,
          lmstudio_model: settings.lmstudioModel,
          opencode_model: settings.opencodeModel,
          debug_mode: String(settings.debugMode),
        }),
      });
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return { settings, loading, saving, update, save };
}
