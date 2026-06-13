'use client';

import { cn } from '@/lib/utils/cn';
import { forwardRef } from 'react';

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ tabs, activeTab, onChange, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex gap-1 p-1 bg-parchment-dark rounded-lg', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200',
              activeTab === tab.value
                ? 'bg-white text-teal shadow-sm'
                : 'text-muted hover:text-navy'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
