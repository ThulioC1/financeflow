import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Balance } from "@/lib/types";

// Mock data, to be replaced by Firestore data
const mockHistory: Balance[] = [
    { id: '1', userId: '123', mesReferencia: '2024-06', saldoInicial: 500, totalReceitas: 5000, totalDespesas: 3749.25, saldoFinal: 1750.75 },
    { id: '2', userId: '123', mesReferencia: '2024-05', saldoInicial: 800, totalReceitas: 4800, totalDespesas: 4100, saldoFinal: 1500 },
    { id: '3', userId: '123', mesReferencia: '2024-04', saldoInicial: 1200, totalReceitas: 4500, totalDespesas: 4900, saldoFinal: 800 },
];

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
};

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Histórico Mensal</h1>
        <p className="text-muted-foreground">Consulte o resumo de meses anteriores.</p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {mockHistory.map(balance => (
          <AccordionItem value={balance.id} key={balance.id}>
            <AccordionTrigger className="text-lg font-semibold capitalize">
              {formatMonth(balance.mesReferencia)}
            </AccordionTrigger>
            <AccordionContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Total Recebido</h4>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(balance.totalReceitas)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Total Gasto</h4>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(balance.totalDespesas)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Saldo Final</h4>
                        <p className={`text-xl font-bold ${balance.saldoFinal >= 0 ? 'text-foreground' : 'text-red-600'}`}>{formatCurrency(balance.saldoFinal)}</p>
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
