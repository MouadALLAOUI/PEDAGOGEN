'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = '0';
      ref.current.style.transform = 'translateY(12px)';

      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
          ref.current.style.opacity = '1';
          ref.current.style.transform = 'translateY(0)';
        }
      });
    }
  }, []);

  return <div ref={ref}>{children}</div>;
}
