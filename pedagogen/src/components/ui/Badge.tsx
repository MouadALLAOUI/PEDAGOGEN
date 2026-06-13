import { cn } from '@/lib/utils/cn';
import { type HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'teal' | 'gold' | 'red' | 'green' | 'muted';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          {
            'bg-parchment-dark text-navy': variant === 'default',
            'bg-teal-50 text-teal-dark': variant === 'teal',
            'bg-gold/10 text-gold': variant === 'gold',
            'bg-red/10 text-red': variant === 'red',
            'bg-green/10 text-green': variant === 'green',
            'bg-muted/20 text-muted': variant === 'muted',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, type BadgeProps };
