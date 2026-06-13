'use client';

import { cn } from '@/lib/utils/cn';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-navy mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-lg border border-border bg-white px-3 py-2 pr-8 text-sm text-navy',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-navy-light/5',
              error && 'border-red focus:ring-red/30 focus:border-red',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select, type SelectProps };
