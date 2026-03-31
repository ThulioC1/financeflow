
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyzeFinances, type FinancialAdvisorOutput } from '@/ai/flows/financial-advisor';
import { Loader2, BrainCircuit, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface AdvisorCardProps {
  data: {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    expensesByCategory: { category: string; amount: number }[];
  };
  history: { month: string; balance: number }[];
}

export function AdvisorCard({ data, history }: AdvisorCardProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinancialAdvisorOutput | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeFinances({
        currentMonth: data,
        history: history,
      });
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro na Análise',
        description: 'Não foi possível obter os conselhos da IA agora.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'baixo': return 'bg-green-100 text-green-700 border-green-200';
      case 'médio': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'alto': return 'bg-red-100 text-red-700 border-red-200';
      default: return '';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'baixo': return <ShieldCheck className="h-4 w-4" />;
      case 'médio': return <AlertTriangle className="h-4 w-4" />;
      case 'alto': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Card className="h-full border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="font-headline flex items-center gap-2">
              <BrainCircuit className="text-primary h-5 w-5" />
              Consultor Financeiro IA
            </CardTitle>
            <CardDescription>Análise estratégica das suas finanças.</CardDescription>
          </div>
          {analysis && (
            <Badge className={getRiskColor(analysis.riskLevel)}>
              <div className="flex items-center gap-1">
                {getRiskIcon(analysis.riskLevel)}
                Risco {analysis.riskLevel}
              </div>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="animate-pulse font-medium">Processando seus dados financeiros...</p>
            <p className="text-xs">Isso pode levar alguns segundos.</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="rounded-lg bg-muted/30 p-4 border text-sm leading-relaxed">
              <p className="font-semibold mb-2 text-primary">Resumo da IA:</p>
              {analysis.summary}
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Recomendações:
              </p>
              <ul className="grid gap-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm bg-background border rounded-md p-3 shadow-sm flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
            
            <Button variant="outline" onClick={() => setAnalysis(null)} className="w-full">
              Nova Análise
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center">
              <BrainCircuit className="h-8 w-8 text-primary/40" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Pronto para uma análise?</p>
              <p className="text-xs text-muted-foreground px-6">
                A IA analisará seus ganhos, gastos e histórico para sugerir melhorias na sua saúde financeira.
              </p>
            </div>
            <Button onClick={handleAnalyze} className="w-full">
              Analisar Minhas Finanças
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
