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

const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(240 5.9% 10%)',
    'hsl(0 72.2% 50.6%)',
    'hsl(24.6 95% 53.1%)',
];

export function OverviewChart({ expenses, isLoading }: OverviewChartProps) {
    const data = useMemo(() => {
        if (!expenses) return [];
        
        const categoryTotals = expenses.reduce((acc, expense) => {
            const category = expense.categoria;
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += expense.valor;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(categoryTotals).map(([name, value]) => ({
            name,
            value,
        }));
    }, [expenses]);


  return (
     <Card className="h-full">
      <CardHeader>
        <CardTitle className='font-headline'>Despesas por Categoria</CardTitle>
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
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
              <Legend wrapperStyle={{fontSize: "0.875rem"}}/>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    if (percent === 0) return null;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                        </text>
                    );
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <p>Nenhuma despesa registrada para este mês.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
