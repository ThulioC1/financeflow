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
import type { Expense } from "@/lib/types";

// Mock data, to be replaced by Firestore data
const mockExpenses: Expense[] = [
    { id: '1', userId: '123', descricao: 'Aluguel', categoria: 'Moradia', recorrente: true, valor: 1500, mesReferencia: '2024-07', status: 'pago', createdAt: new Date() as any },
    { id: '2', userId: '123', descricao: 'Supermercado', categoria: 'Alimentação', recorrente: false, valor: 650.45, mesReferencia: '2024-07', status: 'pago', createdAt: new Date() as any },
    { id: '3', userId: '123', descricao: 'Internet', categoria: 'Contas', recorrente: true, valor: 99.90, mesReferencia: '2024-07', status: 'pendente', createdAt: new Date() as any },
    { id: '4', userId: '123', descricao: 'Cinema', categoria: 'Lazer', recorrente: false, valor: 80, mesReferencia: '2024-07', status: 'pago', createdAt: new Date() as any },
];

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function DespesasPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Despesas</h1>
            <p className="text-muted-foreground">Controle seus gastos mensais.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Despesa
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mockExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.descricao}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{expense.categoria}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.valor)}</TableCell>
                        <TableCell>
                            <Badge variant={expense.status === 'pago' ? 'default' : 'secondary'} className={expense.status === 'pago' ? 'bg-green-500/80 hover:bg-green-500' : ''}>
                                {expense.status}
                            </Badge>
                        </TableCell>
                         <TableCell className="text-right">
                             {expense.status === 'pendente' && (
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
