'use client';

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { AddExpenseDialog } from "@/components/dashboard/add-expense-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};


export default function DespesasPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'expenses');
  }, [db, user]);

  const { data: allExpenses, isLoading } = useCollection<Expense>(expensesQuery);

  const availableMonths = useMemo(() => {
    if (!allExpenses) return [selectedMonth];
    const months = [...new Set(allExpenses.map(e => e.mesReferencia))];
    if (!months.includes(selectedMonth)) {
        months.push(selectedMonth);
    }
    return months.sort().reverse();
  }, [allExpenses, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter(expense => expense.mesReferencia === selectedMonth);
  }, [allExpenses, selectedMonth]);

  const handleMarkAsPaid = (expenseId: string) => {
    if (!user) return;
    const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseId);
    updateDocumentNonBlocking(expenseRef, { status: 'pago' });
    toast({
        title: 'Despesa atualizada!',
        description: 'A despesa foi marcada como paga.'
    });
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Despesas</h1>
            <p className="text-muted-foreground">Controle seus gastos mensais.</p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Selecione um mês" />
                </SelectTrigger>
                <SelectContent>
                    {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                            {formatMonth(month)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <AddExpenseDialog>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Despesa
                </Button>
            </AddExpenseDialog>
        </div>
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
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                             <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.descricao}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{expense.categoria}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(expense.valor)}</TableCell>
                            <TableCell>
                                <Badge variant={expense.status === 'pago' ? 'success' : 'destructive'}>
                                    {expense.status}
                                </Badge>
                            </TableCell>
                             <TableCell className="text-right">
                                 {expense.status === 'pendente' && (
                                    <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(expense.id)}>Marcar como pago</Button>
                                 )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            Nenhuma despesa encontrada para este mês.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
