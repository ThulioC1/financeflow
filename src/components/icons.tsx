import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="20" cy="20" r="20" fill="hsl(var(--primary))"/>
      <g transform="translate(8, 8)">
        <path d="M10 5.5c-1.3 2.1-1.3 5.1 0 6.5h4c1.3-1.8 1.3-4.1 0-6.5-1.4-1.9-3-1.9-4 0Z" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m14 12-2 3-2-3" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.5 5.5 8 7c-.8.8-1 2-1 3v2c0 1 .2 2 1 3l1.5 1.5" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.5 5.5 16 7c.8.8 1 2 1 3v2c0 1-.2 2-1 3l-1.5 1.5" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13.7V17c0 1.7 1.3 3 3 3h14c1.7 0 3-1.3 3-3v-3.3" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 17v2" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 17v2" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 20v1.5c0 1.4 1.1 2.5 2.5 2.5h5c1.4 0 2.5-1.1 2.5-2.5V20" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 4.5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}
