'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { forecastIncome, ForecastIncomeOutput } from '@/ai/flows/balance-forecasting';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const pastIncomeData = [
    { month: '2023-01', income: 4000 },
    { month: '2023-02', income: 3000 },
    { month: '2023-03', income: 5000 },
    { month: '2023-04', income: 2780 },
    { month: '2023-05', income: 1890 },
    { month: '2023-06', income: 2390 },
];

export function ForecastCard() {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastIncomeOutput | null>(null);
  const { toast } = useToast();

  const handleForecast = async () => {
    setLoading(true);
    setForecast(null);
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const result = await forecastIncome({ pastIncomeData, currentMonth });
        setForecast(result);
    } catch (error) {
        console.error(error);
        toast({
            title: 'Erro na Previsão',
            description: 'Não foi possível gerar a previsão de renda.',
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary" />
            Previsão de Renda
        </CardTitle>
        <CardDescription>Use IA para prever sua renda no mês atual.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        {loading ? (
            <div className="flex flex-col items-center text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p>Analisando seus dados e gerando previsão...</p>
            </div>
        ) : forecast ? (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle className="font-bold text-lg text-primary">{formatCurrency(forecast.forecastedIncome)}</AlertTitle>
            <AlertDescription>
              {forecast.explanation}
            </AlertDescription>
          </Alert>
        ) : (
            <div className="text-center text-muted-foreground">
                <p>Clique no botão para obter uma previsão de renda para o mês atual com base em seu histórico.</p>
            </div>
        )}
        <Button onClick={handleForecast} disabled={loading} className="w-full">
          {loading ? 'Calculando...' : 'Gerar Previsão'}
        </Button>
      </CardContent>
    </Card>
  );
}
