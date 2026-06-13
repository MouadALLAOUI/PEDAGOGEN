'use client';

import { cn } from '@/lib/utils/cn';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-navy mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy',
            'placeholder:text-muted/60',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-navy-light/5',
            'min-h-[80px] resize-y',
            error && 'border-red focus:ring-red/30 focus:border-red',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red">{error}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea, type TextareaProps };
