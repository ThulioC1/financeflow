
'use client';

import { useState, useMemo } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { AdvisorCard } from '@/components/dashboard/advisor-card';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
  PiggyBank as PiggyIcon
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip,
  Cell
} from 'recharts';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Income, Expense, PiggyBank } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

  const banksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'piggy_banks');
  }, [db, user]);

  const { data: incomes, isLoading: isLoadingIncomes } = useCollection<Income>(incomesQuery);
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);
  const { data: banks, isLoading: isLoadingBanks } = useCollection<PiggyBank>(banksQuery);

  const isLoading = isLoadingIncomes || isLoadingExpenses || isLoadingBanks;

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
    const result = {
      saldoInicial: 0,
      totalRecebido: 0,
      totalGasto: 0,
      saldoAtual: 0,
      totalCofrinhos: 0,
      currentMonthExpenses: [] as Expense[],
      dailyExpenses: [] as { day: number; valor: number }[],
      expensesByCategory: [] as { category: string; amount: number }[],
    };

    if (banks) {
      result.totalCofrinhos = banks.reduce((acc, b) => acc + (Number(b.valorAtual) || 0), 0);
    }

    if (!incomes || !expenses) return result;
    
    const previousIncomes = incomes.filter(i => i.mesReferencia < selectedMonth && i.status === 'pago');
    const previousExpenses = expenses.filter(e => e.mesReferencia < selectedMonth && e.status === 'pago');
    const totalPreviousIncome = previousIncomes.reduce((acc, i) => acc + i.valor, 0);
    const totalPreviousExpense = previousExpenses.reduce((acc, e) => acc + e.valor, 0);
    
    result.saldoInicial = totalPreviousIncome - totalPreviousExpense;

    const selectedMonthIncomes = incomes.filter(i => i.mesReferencia === selectedMonth && i.status === 'pago');
    const selectedMonthExpenses = expenses.filter(e => e.mesReferencia === selectedMonth);

    result.totalRecebido = selectedMonthIncomes.reduce((acc, i) => acc + i.valor, 0);
    // Mudança: Consideramos todas as despesas do mês no total de "Gasto planejado/atual" para visão geral
    result.totalGasto = selectedMonthExpenses.reduce((acc, e) => acc + e.valor, 0);
    result.saldoAtual = (result.saldoInicial + result.totalRecebido - result.totalGasto) - result.totalCofrinhos;
    result.currentMonthExpenses = selectedMonthExpenses;

    // Cálculo diário (Usando todas as despesas do mês para o gráfico não ficar vazio)
    const dailyMap: Record<number, number> = {};
    selectedMonthExpenses.forEach(exp => {
      // Prioridade de data: Pagamento > Vencimento > Criação
      const date = exp.dataPagamento?.toDate() || exp.dataVencimento?.toDate() || exp.createdAt?.toDate();
      if (date) {
        const day = date.getDate();
        dailyMap[day] = (dailyMap[day] || 0) + exp.valor;
      }
    });
    result.dailyExpenses = Object.entries(dailyMap)
      .map(([day, valor]) => ({ day: parseInt(day), valor }))
      .sort((a, b) => a.day - b.day);

    // Categorias para o Advisor (sempre todas do mês)
    const categoryMap: Record<string, number> = {};
    selectedMonthExpenses.forEach(exp => {
      categoryMap[exp.categoria] = (categoryMap[exp.categoria] || 0) + exp.valor;
    });
    result.expensesByCategory = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }));

    return result;
  }, [incomes, expenses, banks, selectedMonth]);

  const history = useMemo(() => {
    return availableMonths.slice(1, 4).map(m => ({
      month: m,
      balance: 0
    }));
  }, [availableMonths]);

  return (
    <div className="space-y-8 pb-12">
       <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Visão Geral</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Relatório financeiro de <span className="font-bold text-foreground capitalize">{formatMonth(selectedMonth)}</span>.
              </p>
          </div>
          <div className="w-full sm:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[220px]">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)
        ) : (
          <>
            <StatCard title="Saldo Livre" value={formatCurrency(stats.saldoAtual)} icon={Wallet} description="Projeção após despesas e cofrinhos" color="bg-primary shadow-primary/20" />
            <StatCard title="Receitas" value={formatCurrency(stats.totalRecebido)} icon={ArrowUpRight} description="Total recebido no mês" color="bg-emerald-500 shadow-emerald-200" />
            <StatCard title="Despesas" value={formatCurrency(stats.totalGasto)} icon={ArrowDownRight} description="Total registrado no mês" color="bg-rose-500 shadow-rose-200" />
            <StatCard title="Balanço" value={formatCurrency(stats.totalRecebido - stats.totalGasto)} icon={BarChart3} description="Diferença E/S do mês" color="bg-blue-600 shadow-blue-200" />
            <StatCard title="Cofrinhos" value={formatCurrency(stats.totalCofrinhos)} icon={PiggyIcon} description="Total reservado" color="bg-violet-600 shadow-violet-200" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <OverviewChart expenses={stats.currentMonthExpenses} isLoading={isLoading} />
          
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-bold">Resumo Diário</CardTitle>
              <CardDescription>Gastos consolidados por dia (pagos e pendentes).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : stats.dailyExpenses.length > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dailyExpenses}>
                      <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Valor']}
                        labelFormatter={(label) => `Dia ${label}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                        {stats.dailyExpenses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="var(--primary)" fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma despesa para este mês.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AdvisorCard 
            data={{
              month: selectedMonth,
              totalIncome: stats.totalRecebido,
              totalExpenses: stats.totalGasto,
              expensesByCategory: stats.expensesByCategory
            }}
            history={history}
          />
        </div>
      </div>
    </div>
  );
}
