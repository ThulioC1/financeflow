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
  Info,
  Activity,
  CalendarCheck,
  ChevronRight,
  AlertCircle
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
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

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
    if (!months.has(currentMonth)) months.add(currentMonth);
    return Array.from(months).sort().reverse();
  }, [incomes, expenses, isLoading, selectedMonth]);

  const stats = useMemo(() => {
    const result = {
      saldoInicial: 0,
      totalRecebido: 0,
      totalReceitaPrevista: 0,
      totalGasto: 0,
      totalPendente: 0,
      saldoAtual: 0,
      totalCofrinhos: 0,
      budgetHealth: 0,
      timeProgress: 0,
      dailyExpenses: [] as any[],
      foundCategories: [] as string[],
      currentMonthExpenses: [] as Expense[],
      upcomingExpenses: [] as Expense[],
    };

    if (banks) result.totalCofrinhos = banks.reduce((acc, b) => acc + (Number(b.valorAtual) || 0), 0);
    if (!incomes || !expenses) return result;
    
    // Calcula Saldo Inicial (meses anteriores)
    const previousIncomes = incomes.filter(i => i.mesReferencia < selectedMonth && i.status === 'pago');
    const previousExpenses = expenses.filter(e => e.mesReferencia < selectedMonth && e.status === 'pago');
    result.saldoInicial = previousIncomes.reduce((acc, i) => acc + i.valor, 0) - previousExpenses.reduce((acc, e) => acc + e.valor, 0);

    // Dados do mês selecionado
    const selIncomes = incomes.filter(i => i.mesReferencia === selectedMonth);
    const selExpenses = expenses.filter(e => e.mesReferencia === selectedMonth);

    result.totalRecebido = selIncomes.filter(i => i.status === 'pago').reduce((acc, i) => acc + i.valor, 0);
    result.totalReceitaPrevista = selIncomes.reduce((acc, i) => acc + i.valor, 0);
    result.totalGasto = selExpenses.filter(e => e.status === 'pago').reduce((acc, e) => acc + e.valor, 0);
    result.totalPendente = selExpenses.filter(e => e.status === 'pendente').reduce((acc, e) => acc + e.valor, 0);
    
    // Saldo Livre = (Saldo Anterior + O que recebi hoje - O que já paguei) - O que está no cofre
    result.saldoAtual = (result.saldoInicial + result.totalRecebido - result.totalGasto) - result.totalCofrinhos;
    result.currentMonthExpenses = selExpenses;

    // Próximas 5 contas a vencer (pendentes com data de vencimento)
    result.upcomingExpenses = expenses
      .filter(e => e.status === 'pendente' && e.dataVencimento)
      .sort((a, b) => {
        const dateA = a.dataVencimento?.toMillis() || 0;
        const dateB = b.dataVencimento?.toMillis() || 0;
        return dateA - dateB;
      })
      .slice(0, 5);

    // Comprometimento da Renda
    const totalCommitment = result.totalGasto + result.totalPendente;
    const baseRenda = result.totalReceitaPrevista > 0 ? result.totalReceitaPrevista : (result.saldoInicial > 0 ? result.saldoInicial : 0);
    result.budgetHealth = baseRenda > 0 ? (totalCommitment / baseRenda) * 100 : 0;

    // Progresso do tempo no mês
    const today = new Date();
    if (selectedMonth === today.toISOString().slice(0, 7)) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      result.timeProgress = (today.getDate() / daysInMonth) * 100;
    } else {
      result.timeProgress = 100;
    }

    // Dados para o gráfico diário
    const dailyMap: Record<number, any> = {};
    const categoriesSet = new Set<string>();
    selExpenses.forEach(exp => {
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
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{availableMonths.map(month => <SelectItem key={month} value={month} className="capitalize">{formatMonth(month)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)
        ) : (
          <>
            <StatCard title="Saldo Livre" value={formatCurrency(stats.saldoAtual)} icon={Wallet} description="Dinheiro disponível hoje" color="bg-primary shadow-primary/20" info="Reflete o dinheiro em conta hoje, descontando o que já foi pago e os cofrinhos. Contas pendentes não são subtraídas pois o dinheiro ainda não saiu da sua conta." />
            <StatCard title="Receitas" value={formatCurrency(stats.totalRecebido)} icon={ArrowUpRight} description="Total recebido" color="bg-emerald-500 shadow-emerald-200" info="Soma das rendas marcadas como pagas no mês selecionado." />
            <StatCard title="Despesas" value={formatCurrency(stats.totalGasto)} icon={ArrowDownRight} description="Total pago" color="bg-rose-500 shadow-rose-200" info="Total de gastos já marcados como pagos." />
            <StatCard title="A Pagar" value={formatCurrency(stats.totalPendente)} icon={Clock} description="Aguardando pagamento" color="bg-amber-500 shadow-amber-200" info="Gastos pendentes para este mês." />
            <StatCard title="Balanço" value={formatCurrency(stats.totalRecebido - stats.totalGasto)} icon={BarChart3} description="Entradas - Pagos" color="bg-blue-600 shadow-blue-200" info="Diferença entre o recebido e o efetivamente pago." />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Consumo da Renda */}
        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Consumo da Renda
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p>Mede quanto da sua renda prevista (e economias) já foi consumida por despesas totais (pagas + pendentes).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Comprometimento do orçamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gastos vs Renda</span>
                <span className="font-bold">{stats.budgetHealth.toFixed(1)}%</span>
              </div>
              <Progress value={stats.budgetHealth} className={cn("h-2", stats.budgetHealth > 90 ? "bg-red-100 [&>div]:bg-red-500" : stats.budgetHealth > 70 ? "bg-amber-100 [&>div]:bg-amber-500" : "[&>div]:bg-primary")} />
            </div>
            <p className="text-xs text-muted-foreground italic">
              {stats.budgetHealth > 100 ? "Atenção: Orçamento excedido!" : "Comprometimento saudável."}
            </p>
          </CardContent>
        </Card>

        {/* Progresso do Mês */}
        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-500" />
              Progresso do Mês
               <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p>Compara quanto tempo do mês já passou com quanto você já gastou.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Tempo decorrido no mês.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dias passados</span>
                <span className="font-bold">{stats.timeProgress.toFixed(0)}%</span>
              </div>
              <Progress value={stats.timeProgress} className="h-2 bg-indigo-100 [&>div]:bg-indigo-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.timeProgress > stats.budgetHealth ? "Gastos sob controle." : "Alerta de evolução rápida."}
            </p>
          </CardContent>
        </Card>

        {/* Próximos Vencimentos */}
        <Link href="/dashboard/despesas" className="block transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <Card className="border-primary/20 shadow-md h-full bg-primary/[0.02] overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-rose-500" />
                  Próximos Vencimentos
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
              <CardDescription>Próximas 5 contas pendentes.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : stats.upcomingExpenses.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingExpenses.map((expense) => {
                    const isOverdue = (expense.dataVencimento?.toMillis() || 0) < Date.now();
                    return (
                      <div key={expense.id} className="flex items-center justify-between gap-2 text-sm border-b border-dashed pb-2 last:border-0">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">{expense.descricao}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4" style={{ borderColor: CATEGORY_COLORS[expense.categoria], color: CATEGORY_COLORS[expense.categoria] }}>
                              {expense.categoria}
                            </Badge>
                            <span className={cn("text-[10px] flex items-center gap-1", isOverdue ? "text-rose-600 font-bold" : "text-muted-foreground")}>
                              {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                              {expense.dataVencimento?.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs whitespace-nowrap">
                          {formatCurrency(expense.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-xs text-muted-foreground italic">
                  Tudo em dia! Nenhuma conta pendente.
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OverviewChart expenses={stats.currentMonthExpenses} isLoading={isLoading} />
        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">Resumo Diário</CardTitle>
                <CardDescription>Gastos consolidados por categoria.</CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p>Mostra como seus gastos estão distribuídos ao longo dos dias do mês.</p>
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
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                      <RechartsTooltip formatter={(v: number) => [formatCurrency(v), 'Valor']} labelFormatter={(l) => `Dia ${l}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      {stats.foundCategories.map((cat) => <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || '#71717a'} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="flex h-48 items-center justify-center text-muted-foreground italic text-sm">Nenhum gasto registrado.</div>}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
