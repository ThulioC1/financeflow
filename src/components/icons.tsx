
'use client';

import type { SVGProps } from 'react';

/**
 * Logo oficial do Ca$hOrd.
 * Representa a união entre finanças (cifrão) e organização (pilar verde).
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="url(#logo-grad-cashord-v2)" />
      {/* C Estilizado que envolve o $ */}
      <path 
        d="M26 14C24.5 12.5 22.5 12 20 12C14.5 12 11 15.5 11 20C11 24.5 14.5 28 20 28C22.5 28 24.5 27.5 26 26" 
        stroke="white" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Símbolo de Cifrão sutil no centro */}
      <path 
        d="M20 9V31" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        className="opacity-40"
      />
      {/* Ponto de Ordem e Crescimento Verde - A Marca do Ca$hOrd */}
      <circle cx="29" cy="11" r="4" fill="#10b981" stroke="white" strokeWidth="1.5" />
      <defs>
        <linearGradient id="logo-grad-cashord-v2" x1="0" y1="0" x2="40" y2="40" gradientUnits='userSpaceOnUse'>
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
