'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Expense } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Monitora as despesas do usuário e exibe alertas visuais no topo da página
 * para contas que vencem no dia de hoje.
 */
export function NotificationChecker() {
  const { user } = useUser();
  const db = useFirestore();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'expenses');
  }, [db, user]);

  const { data: expenses } = useCollection<Expense>(expensesQuery);

  const dueToday = useMemo(() => {
    if (!expenses) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expenses.filter((expense) => {
      if (expense.status !== 'pendente' || !expense.dataVencimento || dismissedIds.has(expense.id)) return false;
      
      const dueDate = expense.dataVencimento.toDate();
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() === today.getTime();
    });
  }, [expenses, dismissedIds]);

  if (dueToday.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
      {dueToday.map((expense) => (
        <Alert key={expense.id} variant="destructive" className="relative border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 shadow-sm">
          <AlertCircle className="h-4 w-4 mt-1" />
          <div className="pr-8">
            <AlertTitle className="font-bold">⚠️ Conta vencendo hoje!</AlertTitle>
            <AlertDescription className="text-sm opacity-90">
              A despesa <span className="font-bold">"{expense.descricao}"</span> no valor de <span className="font-bold">{formatCurrency(expense.valor)}</span> vence hoje. Não esqueça de pagar!
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900/40 text-rose-900 dark:text-rose-200"
            onClick={() => handleDismiss(expense.id)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </Alert>
      ))}
    </div>
  );
}
