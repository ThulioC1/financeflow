
'use client';

import { AuthForm } from '@/components/auth/auth-form';
import { Logo } from '@/components/icons';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 p-4">
      {/* Decorative Gradients */}
      <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-accent/10 blur-[120px]" />
      
      <div className="relative w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 transition-transform hover:scale-105 duration-300">
            <Logo className="h-16 w-16" />
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Ca$h<span className="text-primary">Ord</span>
          </h1>
          <p className="mt-2 text-balance text-slate-500 dark:text-slate-400">
            A ordem que o seu dinheiro merece.
          </p>
        </div>
        
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-200/50 dark:ring-slate-800/50">
          <AuthForm />
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
          <p>Ca$hOrd &copy; {new Date().getFullYear()} • Inteligência em Organização Financeira</p>
        </footer>
      </div>
    </div>
  );
}
