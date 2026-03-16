
'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Expense } from '@/lib/types';

/**
 * Monitora as despesas do usuário e notifica via Toast
 * quando existem contas que vencem no dia de hoje.
 */
export function NotificationChecker() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const notifiedIds = useRef<Set<string>>(new Set());

  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'expenses');
  }, [db, user]);

  const { data: expenses } = useCollection<Expense>(expensesQuery);

  useEffect(() => {
    if (!expenses) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueToday = expenses.filter((expense) => {
      if (expense.status !== 'pendente' || !expense.dataVencimento) return false;
      
      const dueDate = expense.dataVencimento.toDate();
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() === today.getTime();
    });

    dueToday.forEach((expense) => {
      if (!notifiedIds.current.has(expense.id)) {
        toast({
          title: '⚠️ Conta vencendo hoje!',
          description: `A despesa "${expense.descricao}" vence hoje. Não esqueça de pagar!`,
          variant: 'destructive',
        });
        notifiedIds.current.add(expense.id);
      }
    });
  }, [expenses, toast]);

  return null;
}
