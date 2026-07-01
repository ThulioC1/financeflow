'use client';

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, CheckCircle2 } from "lucide-react";
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
import { collection, doc, Timestamp, serverTimestamp } from "firebase/firestore";
import { deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { AddExpenseDialog } from "@/components/dashboard/add-expense-dialog";
import { EditExpenseDialog } from "@/components/dashboard/edit-expense-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { addMonths } from 'date-fns';

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
  const [sortBy, setSortBy] = useState<'status' | 'dataPagamento' | 'createdAt'>('status');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'expenses');
  }, [db, user]);

  const { data: allExpenses, isLoading } = useCollection<Expense>(expensesQuery);

  const handleRefresh = () => {
    setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        router.refresh();
    }, 100);
  };

  const availableMonths = useMemo(() => {
    if (!allExpenses) return [selectedMonth];
    const months = new Set(allExpenses.map(e => e.mesReferencia.slice(0, 7)));

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!months.has(currentMonth)) {
      months.add(currentMonth);
    }

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

    const recurringTemplates = new Map<string, Expense>();
    allExpenses.forEach(expense => {
        if (expense.recorrente) {
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

        if (templateDate < selectedDate && !expenseExistsForMonth) {
            let projectedDueDate = template.dataVencimento;
            
            if (template.dataVencimento) {
              const originalDue = template.dataVencimento.toDate();
              const monthsDiff = (selectedDate.getFullYear() - templateDate.getFullYear()) * 12 + (selectedDate.getMonth() - templateDate.getMonth());
              const newDueDate = addMonths(originalDue, monthsDiff);
              projectedDueDate = Timestamp.fromDate(newDueDate);
            }

            projectedExpenses.push({
                ...template,
                id: `${template.id}-${selectedMonth}`,
                mesReferencia: selectedMonth,
                status: 'pendente',
                dataPagamento: undefined,
                dataVencimento: projectedDueDate,
                isProjected: true,
            });
        }
    });

    const combinedExpenses = [...expensesForSelectedMonth, ...projectedExpenses]
    
    combinedExpenses.sort((a, b) => {
      switch(sortBy) {
          case 'dataPagamento': {
              const timeA = a.dataPagamento ? a.dataPagamento.toMillis() : 0;
              const timeB = b.dataPagamento ? b.dataPagamento.toMillis() : 0;
              if (timeA === 0 && timeB === 0) return a.descricao.localeCompare(b.descricao);
              if (timeA === 0) return 1;
              if (timeB === 0) return -1;
              return timeB - timeA;
          }
          case 'createdAt': {
              const timeA = a.createdAt?.toMillis() || 0;
              const timeB = b.createdAt?.toMillis() || 0;
              return timeB - timeA;
          }
          case 'status':
          default: {
              if (a.status === b.status) {
                  return a.descricao.localeCompare(b.descricao);
              }
              return a.status === 'pendente' ? -1 : 1;
          }
      }
    });

    return combinedExpenses;
  }, [allExpenses, selectedMonth, sortBy]);

  const handleDeleteConfirm = () => {
    if (!user || !deletingExpenseId) return;
    const expenseRef = doc(db, 'users', user.uid, 'expenses', deletingExpenseId);
    deleteDocumentNonBlocking(expenseRef);
    toast({
        title: 'Despesa excluída!',
        description: 'Sua despesa foi removida com sucesso.'
    });
    setDeletingExpenseId(null);
    handleRefresh();
  };

  const handleMarkAsPaid = (expense: Expense) => {
    if (!user || !db) return;

    if (expense.isProjected) {
        const newId = crypto.randomUUID();
        const newExpenseRef = doc(db, 'users', user.uid, 'expenses', newId);
        
        const dataToCreate = {
            descricao: expense.descricao,
            valor: expense.valor,
            categoria: expense.categoria,
            recorrente: expense.recorrente,
            mesReferencia: expense.mesReferencia,
            id: newId,
            userId: user.uid,
            status: 'pago' as 'pago',
            dataPagamento: Timestamp.now(),
            createdAt: serverTimestamp(),
            dataVencimento: expense.dataVencimento || null,
        };

        setDocumentNonBlocking(newExpenseRef, dataToCreate, {});

    } else {
        const expenseRef = doc(db, 'users', user.uid, 'expenses', expense.id);
        const dataToUpdate = {
            status: 'pago',
            dataPagamento: Timestamp.now(),
        };
        updateDocumentNonBlocking(expenseRef, dataToUpdate);
    }
    
    toast({
        title: 'Sucesso!',
        description: 'Despesa marcada como paga.',
    });
    handleRefresh();
  };

  return (
    <>
    {editingExpense && (
      <EditExpenseDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => {
              if (!open) {
                setEditingExpense(null);
                handleRefresh();
              }
          }}
      />
    )}
    
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
      <header className="grid items-start gap-4 sm:flex">
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Despesas</h1>
          <p className="text-muted-foreground">Controle seus gastos mensais.</p>
        </div>
        <div className="grid w-full grid-cols-1 items-start gap-2 sm:w-auto sm:flex-row sm:items-center md:flex">
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
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="dataPagamento">Data de Pagamento</SelectItem>
                    <SelectItem value="createdAt">Data de Adição</SelectItem>
                </SelectContent>
            </Select>
            <AddExpenseDialog>
                <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Despesa
                </Button>
            </AddExpenseDialog>
        </div>
      </header>
      
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
            <Card key={expense.id} className={cn("w-full transition-all hover:shadow-md", expense.isProjected ? "opacity-60 border-dashed" : "")}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold pr-2">{expense.descricao}</h3>
                      {expense.isProjected && <Badge variant="secondary" className="text-[10px]">Projetada</Badge>}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
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
                                disabled={expense.isProjected}
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
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span className={cn(expense.isProjected && "text-primary font-medium")}>{formatDate(expense.dataVencimento)}</span>
                </div>
                {expense.status === 'pago' && (
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Pago em:</span>
                      <span>{formatDate(expense.dataPagamento)}</span>
                  </div>
                )}
                {expense.status === 'pendente' && (
                    <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleMarkAsPaid(expense)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {expense.isProjected ? 'Efetivar e Pagar' : 'Marcar como Pago'}
                        </Button>
                    </div>
                )}
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
