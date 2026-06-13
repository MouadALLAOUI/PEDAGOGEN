'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { animate, stagger } from 'animejs';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';

    requestAnimationFrame(() => {
      if (!ref.current) return;
      animate(el, {
        opacity: [0, 1],
        translateY: [24, 0],
        scale: [0.98, 1],
        ease: 'outExpo',
        duration: 500,
      });

      animate(el.querySelectorAll('[data-stagger]'), {
        opacity: [0, 1],
        translateY: [12, 0],
        delay: stagger(60),
        ease: 'outQuad',
        duration: 400,
      });
    });
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
