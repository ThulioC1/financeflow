
'use client';

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, CheckCircle2, AlertTriangle, Search, FilterX } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

const CATEGORY_COLORS: Record<string, string> = {
  'Moradia': '#3b82f6',
  'Alimentação': '#10b981',
  'Transporte': '#6366f1',
  'Contas': '#8b5cf6',
  'Lazer': '#06b6d4',
  'Saúde': '#f59e0b',
  'Compras': '#ec4899',
  'Pet': '#2dd4bf',
  'Cartão': '#f43f5e',
  'Outros': '#71717a',
};

const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Contas', 'Lazer', 'Saúde', 'Compras', 'Pet', 'Cartão', 'Outros'];

export default function DespesasPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [sortBy, setSortBy] = useState<'status' | 'dataPagamento' | 'createdAt'>('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

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
    if (!months.has(currentMonth)) months.add(currentMonth);
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

    let combinedExpenses = [...expensesForSelectedMonth, ...projectedExpenses];
    
    // Filtro de Busca
    if (searchTerm) {
      combinedExpenses = combinedExpenses.filter(e => 
        e.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de Categoria
    if (filterCategory !== 'all') {
      combinedExpenses = combinedExpenses.filter(e => e.categoria === filterCategory);
    }

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
              if (a.status === b.status) return a.descricao.localeCompare(b.descricao);
              return a.status === 'pendente' ? -1 : 1;
          }
      }
    });

    return combinedExpenses;
  }, [allExpenses, selectedMonth, sortBy, searchTerm, filterCategory]);

  const handleDeleteConfirm = () => {
    if (!user || !expenseToDelete || !allExpenses) return;

    if (expenseToDelete.recorrente) {
      const futureInstances = allExpenses.filter(e => 
        e.descricao === expenseToDelete.descricao && e.mesReferencia >= selectedMonth
      );
      futureInstances.forEach(exp => {
        const ref = doc(db, 'users', user.uid, 'expenses', exp.id);
        deleteDocumentNonBlocking(ref);
      });
      const pastInstances = allExpenses.filter(e => 
        e.descricao === expenseToDelete.descricao && e.mesReferencia < selectedMonth
      );
      pastInstances.forEach(exp => {
        const ref = doc(db, 'users', user.uid, 'expenses', exp.id);
        updateDocumentNonBlocking(ref, { recorrente: false });
      });
      toast({ title: 'Recorrência encerrada!' });
    } else {
      if (!expenseToDelete.isProjected) {
        const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseToDelete.id);
        deleteDocumentNonBlocking(expenseRef);
        toast({ title: 'Despesa excluída!' });
      }
    }
    setExpenseToDelete(null);
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
        updateDocumentNonBlocking(expenseRef, { status: 'pago', dataPagamento: Timestamp.now() });
    }
    toast({ title: 'Sucesso!', description: 'Despesa marcada como paga.' });
    handleRefresh();
  };

  return (
    <>
    {editingExpense && (
      <EditExpenseDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => {
              if (!open) { setEditingExpense(null); handleRefresh(); }
          }}
      />
    )}
    
    <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {expenseToDelete?.recorrente && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                  {expenseToDelete?.recorrente ? 'Encerrar Recorrência?' : 'Você tem certeza?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {expenseToDelete?.recorrente 
                      ? `Deseja encerrar a recorrência de "${expenseToDelete.descricao}" a partir deste mês?`
                      : 'Essa ação não pode ser desfeita.'}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className={expenseToDelete?.recorrente ? "bg-amber-600 hover:bg-amber-700" : ""}>Confirmar</AlertDialogAction>
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
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Mês" /></SelectTrigger>
                <SelectContent>{availableMonths.map(month => <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>)}</SelectContent>
            </Select>
            <AddExpenseDialog><Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Adicionar</Button></AddExpenseDialog>
        </div>
      </header>

      {/* Barra de Filtros e Busca */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descrição..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="dataPagamento">Pagamento</SelectItem>
                <SelectItem value="createdAt">Recente</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || filterCategory !== 'all') && (
              <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setFilterCategory('all'); }} title="Limpar Filtros">
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
         {isLoading ? (
           Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
         ) : filteredAndRecurringExpenses.length > 0 ? (
           filteredAndRecurringExpenses.map((expense) => (
            <Card key={expense.id} className={cn("w-full transition-all hover:shadow-md relative overflow-hidden", expense.isProjected ? "opacity-60 border-dashed" : "")}>
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: CATEGORY_COLORS[expense.categoria] || '#71717a' }} />
              <CardContent className="p-4 pl-6 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold pr-2">{expense.descricao}</h3>
                      {expense.isProjected && <Badge variant="secondary" className="text-[10px]">Projetada</Badge>}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingExpense(expense)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => setExpenseToDelete(expense)}><Trash2 className="mr-2 h-4 w-4" />{expense.recorrente ? 'Encerrar Recorrência' : 'Excluir'}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge variant="outline" style={{ borderColor: CATEGORY_COLORS[expense.categoria], color: CATEGORY_COLORS[expense.categoria] }}>{expense.categoria}</Badge>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-semibold text-base">{formatCurrency(expense.valor)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={expense.status === 'pago' ? 'success' : 'destructive'}>{expense.status}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span className={cn(expense.isProjected && "text-primary font-medium")}>{formatDate(expense.dataVencimento)}</span>
                </div>
                {expense.status === 'pendente' && (
                    <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleMarkAsPaid(expense)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />{expense.isProjected ? 'Efetivar e Pagar' : 'Marcar como Pago'}
                        </Button>
                    </div>
                )}
              </CardContent>
            </Card>
           ))
         ) : (
           <Card><CardContent className="flex h-32 items-center justify-center text-muted-foreground"><p>Nenhuma despesa encontrada com estes filtros.</p></CardContent></Card>
         )}
       </div>
    </div>
    </>
  );
}
