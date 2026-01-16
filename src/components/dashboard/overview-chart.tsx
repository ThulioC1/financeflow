'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const data = [
  { name: 'Jan', receitas: 4000, despesas: 2400 },
  { name: 'Fev', receitas: 3000, despesas: 1398 },
  { name: 'Mar', receitas: 5000, despesas: 3800 },
  { name: 'Abr', receitas: 2780, despesas: 3908 },
  { name: 'Mai', receitas: 1890, despesas: 4800 },
  { name: 'Jun', receitas: 2390, despesas: 3800 },
  { name: 'Jul', receitas: 3490, despesas: 4300 },
  { name: 'Ago', receitas: 3700, despesas: 2100 },
  { name: 'Set', receitas: 3100, despesas: 2800 },
  { name: 'Out', receitas: 4200, despesas: 2200 },
  { name: 'Nov', receitas: 4800, despesas: 3500 },
  { name: 'Dez', receitas: 4300, despesas: 3100 },
];

export function OverviewChart() {
  return (
     <Card className="h-full">
      <CardHeader>
        <CardTitle className='font-headline'>Visão Geral</CardTitle>
        <CardDescription>Receitas e despesas dos últimos 12 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${value / 1000}k`}
            />
             <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend wrapperStyle={{fontSize: "0.875rem"}}/>
            <Bar dataKey="receitas" fill="hsl(var(--accent))" name="Receitas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" fill="hsl(var(--primary))" name="Despesas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
