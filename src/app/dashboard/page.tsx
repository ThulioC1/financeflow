import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { ForecastCard } from '@/components/dashboard/forecast-card';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Mock data - replace with real data fetching
  const mockStats = {
    saldoInicial: 1250.75,
    totalRecebido: 4500.0,
    totalGasto: 2345.5,
    saldoAtual: 1250.75 + 4500.0 - 2345.5,
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Bom dia!</h1>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{currentDate}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Inicial"
          value={formatCurrency(mockStats.saldoInicial)}
          icon={Banknote}
          description="Saldo do mês anterior"
          color="bg-sky-500"
        />
        <StatCard
          title="Total Recebido"
          value={formatCurrency(mockStats.totalRecebido)}
          icon={TrendingUp}
          description="Receitas pagas no mês"
          color="bg-green-500"
        />
        <StatCard
          title="Total Gasto"
          value={formatCurrency(mockStats.totalGasto)}
          icon={TrendingDown}
          description="Despesas pagas no mês"
          color="bg-red-500"
        />
        <StatCard
          title="Saldo Atual"
          value={formatCurrency(mockStats.saldoAtual)}
          icon={Scale}
          description="Seu saldo neste momento"
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
           <OverviewChart />
        </div>
        <div>
           <ForecastCard />
        </div>
      </div>
    </div>
  );
}
