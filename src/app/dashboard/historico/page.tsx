'use client';

import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import type { Income, Expense, Balance } from "@/lib/types";
import { Skeleton } from '@/components/ui/skeleton';


const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

export default function HistoricoPage() {
    const { user } = useUser();
    const db = useFirestore();
  
    const incomesQuery = useMemoFirebase(() => {
      if (!user) return null;
      return collection(db, 'users', user.uid, 'incomes');
    }, [db, user]);
  
    const expensesQuery = useMemoFirebase(() => {
      if (!user) return null;
      return collection(db, 'users', user.uid, 'expenses');
    }, [db, user]);
  
    const { data: incomes, isLoading: isLoadingIncomes } = useCollection<Income>(incomesQuery);
    const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

    const history: Balance[] = useMemo(() => {
        if (!incomes || !expenses) {
            return [];
        }

        const allMonths = new Set([
            ...incomes.map(i => i.mesReferencia), 
            ...expenses.map(e => e.mesReferencia)
        ]);

        const sortedMonths = Array.from(allMonths).sort();

        let previousBalance = 0;
        const balanceHistory: Balance[] = [];

        for (const month of sortedMonths) {
            const monthIncomes = incomes.filter(i => i.mesReferencia === month && i.status === 'pago');
            const monthExpenses = expenses.filter(e => e.mesReferencia === month && e.status === 'pago');

            const totalReceitas = monthIncomes.reduce((acc, i) => acc + i.valor, 0);
            const totalDespesas = monthExpenses.reduce((acc, e) => acc + e.valor, 0);

            const saldoInicial = previousBalance;
            const saldoFinal = saldoInicial + totalReceitas - totalDespesas;
            
            balanceHistory.push({
                id: month,
                userId: user?.uid || '',
                mesReferencia: month,
                saldoInicial,
                totalReceitas,
                totalDespesas,
                saldoFinal
            });
            
            previousBalance = saldoFinal;
        }

        return balanceHistory.sort((a,b) => b.mesReferencia.localeCompare(a.mesReferencia));

    }, [incomes, expenses, user]);

    const isLoading = isLoadingIncomes || isLoadingExpenses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Histórico Mensal</h1>
        <p className="text-muted-foreground">Consulte o resumo de meses anteriores.</p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {isLoading ? (
            Array.from({length: 3}).map((_, i) => (
                <div key={i} className="border-b">
                    <div className='flex items-center justify-between py-4'>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-4" />
                    </div>
                </div>
            ))
        ) : history.length > 0 ? (
            history.map(balance => (
                <AccordionItem value={balance.id} key={balance.id}>
                    <AccordionTrigger className="text-lg font-semibold capitalize">
                    {formatMonth(balance.mesReferencia)}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-lg border p-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Total Recebido</h4>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(balance.totalReceitas)}</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Total Gasto</h4>
                                <p className="text-xl font-bold text-red-600">{formatCurrency(balance.totalDespesas)}</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Saldo Final</h4>
                                <p className={`text-xl font-bold ${balance.saldoFinal >= 0 ? 'text-foreground' : 'text-red-600'}`}>{formatCurrency(balance.saldoFinal)}</p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))
        ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border rounded-lg">
                <p className='text-lg font-semibold'>Nenhum histórico encontrado.</p>
                <p className='text-sm'>Comece adicionando receitas e despesas para ver seu histórico.</p>
            </div>
        )}
      </Accordion>
    </div>
  );
}
