'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronRight, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface DocPreviewProps {
  docType: string;
  jsonStr: string;
  onChange: (path: string, value: unknown) => void;
  onRegen: (path: string) => void;
  regenerating: string | null;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function humanize(key: string): string {
  return key
    .replace(/[_\-]/g, ' ')
    .replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 $2')
    .replace(/^\s+|\s+$/g, '')
    .replace(/^./, (c) => c.toUpperCase());
}




function FieldEditor({
  path,
  value,
  onChange,
  onRegen,
  regenerating,
}: {
  path: string;
  value: JsonValue;
  onChange: (path: string, value: JsonValue) => void;
  onRegen: (path: string) => void;
  regenerating: string | null;
}) {
  const isRegen = regenerating === path;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <div className="group/field flex items-start gap-2">
        <textarea
          key={path}
          defaultValue={String(value)}
          rows={value.toString().length > 90 ? 3 : 1}
          onBlur={(e) => {
            const next = e.target.value;
            const original = String(value);
            if (next === original) return;
            const parsed: JsonValue =
              typeof value === 'number' ? Number(next) : typeof value === 'boolean' ? next === 'true' : next;
            onChange(path, parsed);
          }}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm text-navy bg-white border border-border rounded-lg
                     focus:border-teal focus:ring-1 focus:ring-teal/30 outline-none resize-y leading-relaxed
                     group-hover/field:border-navy-lighter transition-colors"
        />
        <button
          type="button"
          onClick={() => onRegen(path)}
          disabled={regenerating !== null}
          title="Régénérer ce champ avec l'IA"
          className="mt-1 p-1.5 rounded-lg text-muted hover:text-teal hover:bg-teal/10 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isRegen ? <Loader2 size={14} className="animate-spin text-teal" /> : <Sparkles size={14} />}
        </button>
      </div>
    );
  }

  return null;
}

function PreviewNode({
  path,
  value,
  depth,
  onChange,
  onRegen,
  regenerating,
}: {
  path: string;
  value: JsonValue;
  depth: number;
  onChange: (path: string, value: JsonValue) => void;
  onRegen: (path: string) => void;
  regenerating: string | null;
}) {
  const isRegen = regenerating === path;

  if (Array.isArray(value)) {
    const primitives = value.every((v) => v === null || typeof v !== 'object');
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">{humanize(path.split('.').pop() || path)}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRegen(path)}
              disabled={regenerating !== null}
              title="Régénérer ce champ avec l'IA"
              className="p-1.5 rounded-lg text-muted hover:text-teal hover:bg-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRegen ? <Loader2 size={14} className="animate-spin text-teal" /> : <Sparkles size={14} />}
            </button>
            <button
              type="button"
              onClick={() => onChange(path, [...value, primitives ? '' : {}])}
              title="Ajouter un élément"
              className="p-1.5 rounded-lg text-muted hover:text-teal hover:bg-teal/10 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-1.5 pl-3 border-l-2 border-teal/20">
          {value.map((item, i) => {
            const itemPath = `${path}.${i}`;
            if (item !== null && typeof item === 'object') {
              return (
                <div key={itemPath} className="relative p-2.5 bg-navy-light/3 border border-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => onChange(path, value.filter((_, idx) => idx !== i))}
                    title="Supprimer"
                    className="absolute top-2 right-2 p-1 rounded-md text-muted hover:text-red hover:bg-red/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                  <PreviewNode
                    path={itemPath}
                    value={item as JsonValue}
                    depth={depth + 1}
                    onChange={onChange}
                    onRegen={onRegen}
                    regenerating={regenerating}
                  />
                </div>
              );
            }
            return (
              <div key={itemPath} className="group/field flex items-start gap-2">
                <span className="mt-2 text-[10px] font-bold text-muted w-5 shrink-0 text-right">{i + 1}.</span>
                <textarea
                  key={itemPath}
                  defaultValue={String(item ?? '')}
                  rows={String(item ?? '').length > 90 ? 3 : 1}
                  onBlur={(e) => {
                    if (e.target.value === String(item ?? '')) return;
                    onChange(itemPath, e.target.value);
                  }}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-sm text-navy bg-white border border-border rounded-lg
                             focus:border-teal focus:ring-1 focus:ring-teal/30 outline-none resize-y leading-relaxed
                             group-hover/field:border-navy-lighter transition-colors"
                />
                <div className="flex items-center gap-0.5 mt-1">
                  <button
                    type="button"
                    onClick={() => onRegen(itemPath)}
                    disabled={regenerating !== null}
                    title="Régénérer cet élément"
                    className="p-1.5 rounded-lg text-muted hover:text-teal hover:bg-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {regenerating === itemPath ? <Loader2 size={14} className="animate-spin text-teal" /> : <Sparkles size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(path, value.filter((_, idx) => idx !== i))}
                    title="Supprimer"
                    className="p-1.5 rounded-lg text-muted hover:text-red hover:bg-red/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, JsonValue>).filter(([, v]) => v !== null || true);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">
            {humanize(path.split('.').pop() || path)}
          </span>
          <button
            type="button"
            onClick={() => onRegen(path)}
            disabled={regenerating !== null}
            title="Régénérer ce champ avec l'IA"
            className="p-1.5 rounded-lg text-muted hover:text-teal hover:bg-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRegen ? <Loader2 size={14} className="animate-spin text-teal" /> : <Sparkles size={14} />}
          </button>
        </div>
        <div className="space-y-3 pl-3 border-l-2 border-navy/10">
          {entries.map(([key, child]) => (
            <PreviewNode
              key={`${path}.${key}`}
              path={`${path}.${key}`}
              value={child}
              depth={depth + 1}
              onChange={onChange}
              onRegen={onRegen}
              regenerating={regenerating}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold text-navy uppercase tracking-wider">{humanize(path.split('.').pop() || path)}</span>
      <FieldEditor path={path} value={value} onChange={onChange} onRegen={onRegen} regenerating={regenerating} />
    </div>
  );
}

export function DocPreview({ jsonStr, onChange, onRegen, regenerating }: DocPreviewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, data: JSON.parse(jsonStr) as JsonValue };
    } catch {
      return { ok: false as const, data: null };
    }
  }, [jsonStr]);

  if (!parsed.ok) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red bg-red/5">
        <AlertTriangle size={16} className="shrink-0" />
        <span>JSON invalide — vérifiez la syntaxe dans l&apos;onglet JSON.</span>
      </div>
    );
  }

  const root = parsed.data;
  const isRootArray = Array.isArray(root);
  const entries: Array<[string, JsonValue]> = isRootArray
    ? (root as JsonValue[]).map((v, i) => [String(i), v])
    : root !== null && typeof root === 'object'
    ? Object.entries(root as Record<string, JsonValue>)
    : [['value', root]];

  if (isRootArray) {
    return (
      <div className="p-4 space-y-3 bg-navy-light/3">
        {entries.map(([key, child]) => {
          const path = key;
          return (
            <div key={path} className="p-3 bg-white border border-border rounded-xl">
              <PreviewNode
                path={path}
                value={child}
                depth={1}
                onChange={onChange}
                onRegen={onRegen}
                regenerating={regenerating}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-navy-light/3">
      {entries.map(([key, child]) => {
        const path = key;
        const isCollapsed = collapsed[path] ?? false;
        const hasChildren = child !== null && typeof child === 'object';
        return (
          <div key={path} className="p-3 bg-white border border-border rounded-xl">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [path]: !isCollapsed }))}
                className="w-full flex items-center gap-2 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight size={14} className="text-muted" />
                ) : (
                  <ChevronDown size={14} className="text-muted" />
                )}
                <span className="text-xs font-bold text-navy uppercase tracking-wider">{humanize(key)}</span>
              </button>
            ) : (
              <span className="block text-xs font-bold text-navy uppercase tracking-wider mb-1.5">{humanize(key)}</span>
            )}
            {!isCollapsed && (
              <div className={hasChildren ? 'mt-2.5' : ''}>
                <PreviewNode
                  path={path}
                  value={child}
                  depth={1}
                  onChange={onChange}
                  onRegen={onRegen}
                  regenerating={regenerating}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
