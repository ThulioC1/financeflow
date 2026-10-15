import type {Config} from 'tailwindcss';

/**
 * Stack de sistema: a Apple usa SF Pro (via -apple-system), que já vem com
 * optical sizing, tracking tables e ajuste de legibilidade por tamanho.
 * Sobrescrever isso com uma webfont piora a tipografia e custa uma request.
 */
const systemFont = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"SF Pro Text"',
  '"Segoe UI Variable Text"',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // `headline` continua existindo para não quebrar o markup existente,
        // mas resolve para a system font: optical sizing faz o resto.
        body: systemFont,
        headline: systemFont,
        code: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Semânticas de dado. Verde/vermelho são reservados para números —
        // cor decorativa em Chrome rouba a leitura (Apple §16, Craft).
        income: 'hsl(var(--income))',
        expense: 'hsl(var(--expense))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        // Uniforme com raio grande é tell de template. Escala mais contida.
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      /**
       * Escala de sombra deliberadamente rasa. Sombra funda e difusa lê como
       * "card flutuante de demo"; sombra curta e próxima lê como superfície real.
       */
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        md: '0 2px 6px -1px rgb(0 0 0 / 0.08), 0 1px 3px -1px rgb(0 0 0 / 0.04)',
        lg: '0 4px 16px -4px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.05)',
        xl: '0 12px 32px -8px rgb(0 0 0 / 0.14), 0 4px 12px -4px rgb(0 0 0 / 0.06)',
        '2xl': '0 24px 56px -12px rgb(0 0 0 / 0.18), 0 8px 20px -8px rgb(0 0 0 / 0.08)',
        inner: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
      },
      transitionTimingFunction: {
        // Aproximação CSS da mola criticamente amortecida — a curva padrão do iOS.
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
        'spring-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        instant: '80ms',
        quick: '150ms',
        settled: '280ms',
        deliberate: '420ms',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        // Superfície translúcida "chega" como material: blur + escala + opacidade.
        'materialize-in': {
          from: {
            opacity: '0',
            transform: 'scale(0.97) translateY(-4px)',
            filter: 'blur(6px)',
          },
          to: {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
            filter: 'blur(0)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
        'materialize-in': 'materialize-in 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;