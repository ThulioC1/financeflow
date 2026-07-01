
'use client';

import { useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Expense } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface OverviewChartProps {
  expenses?: Expense[];
  isLoading: boolean;
}

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

export function OverviewChart({ expenses, isLoading }: OverviewChartProps) {
    const totalExpenses = useMemo(() => {
        if (!expenses) return 0;
        return expenses.reduce((acc, expense) => acc + expense.valor, 0);
    }, [expenses]);

    const data = useMemo(() => {
        if (!expenses || totalExpenses === 0) return [];
        
        const categoryTotals = expenses.reduce((acc, expense) => {
            const category = expense.categoria;
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += expense.valor;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(categoryTotals).map(([name, value]) => {
            const percent = (value / totalExpenses) * 100;
            return {
                name,
                value,
                percent: percent.toFixed(1),
            };
        });
    }, [expenses, totalExpenses]);

    const renderCustomLegend = (props: any) => {
        const { payload } = props;
        return (
            <ul className="flex flex-wrap justify-center gap-4 mt-6">
                {payload.map((entry: any, index: number) => {
                    const itemData = data.find(d => d.name === entry.value);
                    const percentage = itemData ? itemData.percent : '0';
                    
                    return (
                        <li key={`item-${index}`} className="flex items-center gap-2 text-xs font-medium">
                            <div 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: entry.color }} 
                                aria-hidden="true" 
                            />
                            <span className="flex items-center">
                                <span className="mr-1">{entry.value}</span>
                                <span className="text-muted-foreground">({percentage}%)</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        );
    };


  return (
     <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className='font-headline text-lg'>Despesas por Categoria</CardTitle>
        <CardDescription>Distribuição de gastos do mês atual.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
              <Legend 
                verticalAlign="bottom" 
                content={renderCustomLegend}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry) => (
                  <Cell 
                    key={`cell-${entry.name}`} 
                    fill={CATEGORY_COLORS[entry.name] || '#71717a'} 
                    stroke="transparent" 
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground italic text-sm">
            <p>Nenhuma despesa registrada para este mês.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
