'use client';

import { useState, useMemo } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Income, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
};

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};


export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));


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

  const isLoading = isLoadingIncomes || isLoadingExpenses;

  const availableMonths = useMemo(() => {
    if (isLoading) return [selectedMonth];
    const months = new Set<string>();
    incomes?.forEach(i => months.add(i.mesReferencia));
    expenses?.forEach(e => months.add(e.mesReferencia));

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!months.has(currentMonth)) {
      months.add(currentMonth);
    }
    
    return Array.from(months).sort().reverse();
  }, [incomes, expenses, isLoading, selectedMonth]);

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
    
    const previousIncomes = incomes.filter(i => i.mesReferencia < selectedMonth && i.status === 'pago');
    const previousExpenses = expenses.filter(e => e.mesReferencia < selectedMonth && e.status === 'pago');
    const totalPreviousIncome = previousIncomes.reduce((acc, i) => acc + i.valor, 0);
    const totalPreviousExpense = previousExpenses.reduce((acc, e) => acc + e.valor, 0);
    const saldoInicial = totalPreviousIncome - totalPreviousExpense;

    const selectedMonthIncomes = incomes.filter(i => i.mesReferencia === selectedMonth && i.status === 'pago');
    const selectedMonthExpenses = expenses.filter(e => e.mesReferencia === selectedMonth);
    const paidSelectedMonthExpenses = selectedMonthExpenses.filter(e => e.status === 'pago');

    const totalRecebido = selectedMonthIncomes.reduce((acc, i) => acc + i.valor, 0);
    const totalGasto = paidSelectedMonthExpenses.reduce((acc, e) => acc + e.valor, 0);
    const saldoAtual = saldoInicial + totalRecebido - totalGasto;

    return {
      saldoInicial,
      totalRecebido,
      totalGasto,
      saldoAtual,
      currentMonthExpenses: selectedMonthExpenses,
    };
  }, [incomes, expenses, selectedMonth]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
              <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
              <p className="text-muted-foreground">
                  Resumo financeiro para {formatMonth(selectedMonth)}.
              </p>
          </div>
          <div className="w-full sm:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Selecione um mês" />
              </SelectTrigger>
              <SelectContent>
                  {availableMonths.map(month => (
                      <SelectItem key={month} value={month}>
                          {formatMonth(month)}
                      </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
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
              description="Saldo após movimentações do mês"
              color="bg-indigo-500"
            />
            <StatCard
              title="Saldo Inicial"
              value={formatCurrency(stats.saldoInicial)}
              icon={Banknote}
              description="Saldo do final do mês anterior"
              color="bg-sky-500"
            />
            <StatCard
              title="Receitas no Mês"
              value={formatCurrency(stats.totalRecebido)}
              icon={TrendingUp}
              description="Total de receitas pagas"
              color="bg-green-500"
            />
            <StatCard
              title="Despesas no Mês"
              value={formatCurrency(stats.totalGasto)}
              icon={TrendingDown}
              description="Total de despesas pagas"
              color="bg-red-500"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <OverviewChart expenses={stats.currentMonthExpenses} isLoading={isLoading} />
      </div>
    </div>
  );
}
