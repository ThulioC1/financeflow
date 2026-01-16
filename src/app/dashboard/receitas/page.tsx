import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import type { Income } from "@/lib/types";

// Mock data, to be replaced by Firestore data
const mockIncome: Income[] = [
    { id: '1', userId: '123', valor: 2500, tipo: 'quinzena 1', mesReferencia: '2024-07', status: 'pago', createdAt: new Date() as any, dataRecebimento: new Date('2024-07-05') as any },
    { id: '2', userId: '123', valor: 2500, tipo: 'quinzena 2', mesReferencia: '2024-07', status: 'pendente', createdAt: new Date() as any },
    { id: '3', userId: '123', valor: 500, tipo: 'extra', mesReferencia: '2024-07', status: 'pago', createdAt: new Date() as any, dataRecebimento: new Date('2024-07-15') as any },
];

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: any) => {
    if (!date) return '-';
    // Firebase timestamps need to be converted to Date objects
    const d = date.toDate ? date.toDate() : date;
    return d.toLocaleDateString('pt-BR');
}

export default function ReceitasPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Receitas</h1>
            <p className="text-muted-foreground">Gerencie suas fontes de renda.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Receita
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Recebimento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mockIncome.map((income) => (
                    <TableRow key={income.id}>
                        <TableCell className="font-medium capitalize">{income.tipo}</TableCell>
                        <TableCell className="text-right">{formatCurrency(income.valor)}</TableCell>
                        <TableCell>
                            <Badge variant={income.status === 'pago' ? 'default' : 'secondary'} className={income.status === 'pago' ? 'bg-green-500/80 hover:bg-green-500' : ''}>
                                {income.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{formatDate(income.dataRecebimento)}</TableCell>
                         <TableCell className="text-right">
                             {income.status === 'pendente' && (
                                <Button variant="outline" size="sm">Marcar como pago</Button>
                             )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
