'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { ForecastCard } from '@/components/dashboard/forecast-card';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Income, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

  const stats = useMemo(() => {
    if (!incomes || !expenses) {
      return {
        saldoInicial: 0,
        totalRecebido: 0,
        totalGasto: 0,
        saldoAtual: 0,
        currentMonthExpenses: [],
      };
    }
    
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // Calculate initial balance from all transactions before the current month
    const previousIncomes = incomes.filter(i => i.mesReferencia < currentMonthStr && i.status === 'pago');
    const previousExpenses = expenses.filter(e => e.mesReferencia < currentMonthStr && e.status === 'pago');
    const totalPreviousIncome = previousIncomes.reduce((acc, i) => acc + i.valor, 0);
    const totalPreviousExpense = previousExpenses.reduce((acc, e) => acc + e.valor, 0);
    const saldoInicial = totalPreviousIncome - totalPreviousExpense;

    // Calculate current month's totals
    const currentMonthIncomes = incomes.filter(i => i.mesReferencia === currentMonthStr && i.status === 'pago');
    const currentMonthExpenses = expenses.filter(e => e.mesReferencia === currentMonthStr); // Pass all for chart
    const paidCurrentMonthExpenses = currentMonthExpenses.filter(e => e.status === 'pago');

    const totalRecebido = currentMonthIncomes.reduce((acc, i) => acc + i.valor, 0);
    const totalGasto = paidCurrentMonthExpenses.reduce((acc, e) => acc + e.valor, 0);
    const saldoAtual = saldoInicial + totalRecebido - totalGasto;

    return {
      saldoInicial,
      totalRecebido,
      totalGasto,
      saldoAtual,
      currentMonthExpenses
    };
  }, [incomes, expenses]);

  const isLoading = isLoadingIncomes || isLoadingExpenses;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Bom dia!</h1>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{currentDate}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
          </>
        ) : (
          <>
            <StatCard
              title="Saldo Atual"
              value={formatCurrency(stats.saldoAtual)}
              icon={Scale}
              description="Seu saldo neste momento"
              color="bg-indigo-500"
            />
            <StatCard
              title="Saldo Inicial"
              value={formatCurrency(stats.saldoInicial)}
              icon={Banknote}
              description="Saldo do mês anterior"
              color="bg-sky-500"
            />
            <StatCard
              title="Total Recebido"
              value={formatCurrency(stats.totalRecebido)}
              icon={TrendingUp}
              description="Receitas pagas no mês"
              color="bg-green-500"
            />
            <StatCard
              title="Total Gasto"
              value={formatCurrency(stats.totalGasto)}
              icon={TrendingDown}
              description="Despesas pagas no mês"
              color="bg-red-500"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
           <OverviewChart expenses={stats.currentMonthExpenses} isLoading={isLoading} />
        </div>
        <div>
           <ForecastCard />
        </div>
      </div>
    </div>
  );
}
