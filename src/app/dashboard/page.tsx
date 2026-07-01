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
  Clock,
  Info
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
} from 'recharts';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Income, Expense, PiggyBank } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Mapeamento global de cores por categoria para consistência entre gráficos
const CATEGORY_COLORS: Record<string, string> = {
  'Moradia': '#3b82f6',
  'Alimentação': '#10b981',
  'Transporte': '#6366f1',
  'Contas': '#8b5cf6',
  'Lazer': '#06b6d4',
  'Saúde': '#f59e0b',
  'Compras': '#ec4899',
  'Pet': '#2dd4bf',
  'Cartão': '#f43f5e',
  'Outros': '#71717a',
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
      totalPendente: 0,
      saldoAtual: 0,
      totalCofrinhos: 0,
      currentMonthExpenses: [] as Expense[],
      dailyExpenses: [] as any[],
      expensesByCategory: [] as { category: string; amount: number }[],
      foundCategories: [] as string[],
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
    
    result.totalGasto = selectedMonthExpenses
      .filter(e => e.status === 'pago')
      .reduce((acc, e) => acc + e.valor, 0);
      
    result.totalPendente = selectedMonthExpenses
      .filter(e => e.status === 'pendente')
      .reduce((acc, e) => acc + e.valor, 0);

    // O Saldo Livre reflete o dinheiro em mãos: (Histórico + Entradas atuais) - (Saídas atuais efetivadas) - Reservas
    result.saldoAtual = (result.saldoInicial + result.totalRecebido - result.totalGasto) - result.totalCofrinhos;
    
    result.currentMonthExpenses = selectedMonthExpenses;

    const dailyMap: Record<number, any> = {};
    const categoriesSet = new Set<string>();
    
    selectedMonthExpenses.forEach(exp => {
      const date = exp.dataPagamento?.toDate() || exp.dataVencimento?.toDate() || exp.createdAt?.toDate();
      if (date) {
        const day = date.getDate();
        if (!dailyMap[day]) dailyMap[day] = { day };
        dailyMap[day][exp.categoria] = (dailyMap[day][exp.categoria] || 0) + exp.valor;
        categoriesSet.add(exp.categoria);
      }
    });
    
    result.dailyExpenses = Object.values(dailyMap).sort((a, b) => a.day - b.day);
    result.foundCategories = Array.from(categoriesSet);

    const categoryMap: Record<string, number> = {};
    selectedMonthExpenses.forEach(exp => {
      categoryMap[exp.categoria] = (categoryMap[exp.categoria] || 0) + exp.valor;
    });
    result.expensesByCategory = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }));

    return result;
  }, [incomes, expenses, banks, selectedMonth]);

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
            <StatCard 
              title="Saldo Livre" 
              value={formatCurrency(stats.saldoAtual)} 
              icon={Wallet} 
              description="Dinheiro disponível hoje" 
              color="bg-primary shadow-primary/20"
              info="Dinheiro efetivamente disponível na sua conta hoje, descontando o que você já pagou e o que está reservado nos seus cofrinhos. Contas pendentes não são subtraídas deste saldo."
            />
            <StatCard 
              title="Receitas" 
              value={formatCurrency(stats.totalRecebido)} 
              icon={ArrowUpRight} 
              description="Total recebido" 
              color="bg-emerald-500 shadow-emerald-200"
              info="Soma de todas as rendas marcadas como pagas (recebidas) no mês de referência selecionado."
            />
            <StatCard 
              title="Despesas" 
              value={formatCurrency(stats.totalGasto)} 
              icon={ArrowDownRight} 
              description="Total pago" 
              color="bg-rose-500 shadow-rose-200"
              info="Total de todos os seus gastos que já foram marcados como pagos no mês selecionado."
            />
            <StatCard 
              title="A Pagar" 
              value={formatCurrency(stats.totalPendente)} 
              icon={Clock} 
              description="Aguardando pagamento" 
              color="bg-amber-500 shadow-amber-200"
              info="Soma das despesas que possuem status 'pendente'. Representa seus compromissos financeiros futuros para este mês."
            />
            <StatCard 
              title="Balanço" 
              value={formatCurrency(stats.totalRecebido - stats.totalGasto)} 
              icon={BarChart3} 
              description="Entradas - Pagos" 
              color="bg-blue-600 shadow-blue-200"
              info="A diferença entre tudo o que você recebeu e tudo o que você efetivamente pagou no mês. Reflete sua economia real no período."
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <OverviewChart expenses={stats.currentMonthExpenses} isLoading={isLoading} />
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">Resumo Diário</CardTitle>
                <CardDescription>Consolidado de gastos por categoria e dia.</CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">
                    <p>Este gráfico mostra a soma dos seus gastos em cada dia do mês, divididos por categoria para facilitar a visualização de picos de consumo.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : stats.dailyExpenses.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dailyExpenses}>
                      <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Valor']}
                        labelFormatter={(label) => `Dia ${label}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      {stats.foundCategories.map((category) => (
                        <Bar 
                          key={category} 
                          dataKey={category} 
                          stackId="a" 
                          fill={CATEGORY_COLORS[category] || '#71717a'} 
                          radius={[0, 0, 0, 0]}
                        />
                      ))}
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
      </div>
    </div>
  );
}
