'use client';

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { collection, doc, Timestamp } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { AddExpenseDialog } from "@/components/dashboard/add-expense-dialog";
import { EditExpenseDialog } from "@/components/dashboard/edit-expense-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const formatDate = (date: Timestamp | undefined) => {
    if (!date) return '-';
    const d = date.toDate();
    return d.toLocaleDateString('pt-BR');
}

export default function DespesasPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);


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
    const months = new Set(allExpenses.map(e => e.mesReferencia.slice(0, 7)));

    // Add current month if not present
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!months.has(currentMonth)) {
      months.add(currentMonth);
    }

    // add next 12 months for future planning
    let [year, month] = currentMonth.split('-').map(Number);
    for (let i = 0; i < 12; i++) {
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
        months.add(`${year}-${String(month).padStart(2, '0')}`);
    }

    return Array.from(months).sort().reverse();
  }, [allExpenses, selectedMonth]);

  const filteredAndRecurringExpenses = useMemo(() => {
    if (!allExpenses) return [];

    const expensesForSelectedMonth = allExpenses.filter(e => e.mesReferencia === selectedMonth);

    // Group all expenses by description to find recurring ones
    const recurringTemplates = new Map<string, Expense>();
    allExpenses.forEach(expense => {
        if (expense.recorrente) {
            // Keep the earliest occurrence as the template
            const existing = recurringTemplates.get(expense.descricao);
            if (!existing || new Date(expense.mesReferencia) < new Date(existing.mesReferencia)) {
                recurringTemplates.set(expense.descricao, expense);
            }
        }
    });
    
    const projectedExpenses: Expense[] = [];
    recurringTemplates.forEach(template => {
        const templateDate = new Date(template.mesReferencia + '-02');
        const selectedDate = new Date(selectedMonth + '-02');

        const expenseExistsForMonth = expensesForSelectedMonth.some(
            e => e.descricao === template.descricao
        );

        if (templateDate <= selectedDate && !expenseExistsForMonth) {
            projectedExpenses.push({
                ...template,
                id: `${template.id}-${selectedMonth}`, // synthetic ID for react key
                mesReferencia: selectedMonth,
                status: 'pendente',
                dataPagamento: undefined,
                isProjected: true, // Flag to identify projected expenses
            });
        }
    });

    return [...expensesForSelectedMonth, ...projectedExpenses].sort((a,b) => a.descricao.localeCompare(b.descricao));
  }, [allExpenses, selectedMonth]);

  const handleDeleteConfirm = () => {
    if (!user || !deletingExpenseId) return;
    const expenseRef = doc(db, 'users', user.uid, 'expenses', deletingExpenseId);
    deleteDocumentNonBlocking(expenseRef);
    toast({
        title: 'Despesa excluída!',
        description: 'Sua despesa foi removida com sucesso.'
    });
    setDeletingExpenseId(null);
  };

  return (
    <>
    <EditExpenseDialog
        key={editingExpense?.id}
        expense={editingExpense}
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
    />
    <AlertDialog
        open={!!deletingExpenseId}
        onOpenChange={(open) => !open && setDeletingExpenseId(null)}
    >
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a despesa.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Despesas</h1>
          <p className="text-muted-foreground">Controle seus gastos mensais.</p>
        </div>
        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
            <SelectTrigger className="w-[240px] sm:w-[200px]">
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
            <Button className="w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Despesa
            </Button>
          </AddExpenseDialog>
        </div>
      </div>
      
      <div className="space-y-4">
         {isLoading ? (
           Array.from({ length: 5 }).map((_, i) => (
             <Card key={i}>
               <CardContent className="p-4 space-y-3">
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-5 w-1/4 mt-1" />
                 <Skeleton className="h-5 w-1/3" />
                 <Skeleton className="h-5 w-1/4" />
               </CardContent>
             </Card>
           ))
         ) : filteredAndRecurringExpenses.length > 0 ? (
           filteredAndRecurringExpenses.map((expense) => (
            <Card key={expense.id} className={cn("w-full", expense.isProjected ? "opacity-50" : "")}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold pr-2">{expense.descricao}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={expense.isProjected}>
                            <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" disabled={expense.isProjected}>
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-500 focus:bg-red-50"
                                onClick={() => setDeletingExpenseId(expense.id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge variant="outline">{expense.categoria}</Badge>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-semibold text-base">{formatCurrency(expense.valor)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={expense.status === 'pago' ? 'success' : 'destructive'}>
                        {expense.status}
                    </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Data de Pagamento:</span>
                    <span>{formatDate(expense.dataPagamento)}</span>
                </div>
              </CardContent>
            </Card>
           ))
         ) : (
           <Card>
             <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
               <p>Nenhuma despesa encontrada para este mês.</p>
             </CardContent>
           </Card>
         )}
       </div>
    </div>
    </>
  );
}
