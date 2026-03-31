'use client';

import { useState, useMemo } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="space-y-8">
       <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Visão Geral</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Relatório financeiro de <span className="font-bold text-foreground capitalize">{formatMonth(selectedMonth)}</span>.
              </p>
          </div>
          <div className="w-full sm:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[220px] bg-white shadow-sm border-slate-200">
                  <SelectValue placeholder="Selecione um mês" />
              </SelectTrigger>
              <SelectContent>
                  {availableMonths.map(month => (
                      <SelectItem key={month} value={month} className="capitalize">
                          {formatMonth(month)}
                      </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[120px] rounded-2xl" />
            <Skeleton className="h-[120px] rounded-2xl" />
            <Skeleton className="h-[120px] rounded-2xl" />
            <Skeleton className="h-[120px] rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Saldo Atual"
              value={formatCurrency(stats.saldoAtual)}
              icon={Wallet}
              description="Saldo final projetado"
              color="bg-primary shadow-primary/20"
            />
            <StatCard
              title="Receitas"
              value={formatCurrency(stats.totalRecebido)}
              icon={ArrowUpRight}
              description="Total recebido no mês"
              color="bg-emerald-500 shadow-emerald-200"
            />
            <StatCard
              title="Despesas"
              value={formatCurrency(stats.totalGasto)}
              icon={ArrowDownRight}
              description="Total gasto no mês"
              color="bg-rose-500 shadow-rose-200"
            />
            <StatCard
              title="Balanço"
              value={formatCurrency(stats.totalRecebido - stats.totalGasto)}
              icon={BarChart3}
              description="Diferença entre E/S"
              color="bg-slate-800 shadow-slate-200"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart expenses={stats.currentMonthExpenses} isLoading={isLoading} />
        </div>
        <Card className="h-full border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg font-bold">Resumo Diário</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
               <div className="mb-3 rounded-full bg-slate-100 p-3">
                 <BarChart3 className="h-6 w-6 text-slate-400" />
               </div>
               <p className="text-sm">Analise detalhada por dia vindo em breve.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}