'use client';

import { useState, useMemo } from 'react';
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
import type { Income } from "@/lib/types";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, Timestamp } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { AddIncomeDialog } from "@/components/dashboard/add-income-dialog";
import { EditIncomeDialog } from "@/components/dashboard/edit-income-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: Timestamp | undefined) => {
    if (!date) return '-';
    // Firebase timestamps need to be converted to Date objects
    const d = date.toDate();
    return d.toLocaleDateString('pt-BR');
}

const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

export default function ReceitasPage() {
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);

    const db = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const incomesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(db, 'users', user.uid, 'incomes');
    }, [db, user]);

    const { data: allIncomes, isLoading } = useCollection<Income>(incomesQuery);

    const availableMonths = useMemo(() => {
        if (!allIncomes) return [selectedMonth];
        const months = [...new Set(allIncomes.map(e => e.mesReferencia))];
        if (!months.includes(selectedMonth)) {
            months.push(selectedMonth);
        }
        return months.sort().reverse();
    }, [allIncomes, selectedMonth]);

    const filteredIncomes = useMemo(() => {
        if (!allIncomes) return [];
        return allIncomes.filter(income => income.mesReferencia === selectedMonth).sort((a,b) => a.tipo.localeCompare(b.tipo));
    }, [allIncomes, selectedMonth]);

    const handleDeleteConfirm = () => {
        if (!user || !deletingIncomeId) return;
        const incomeRef = doc(db, 'users', user.uid, 'incomes', deletingIncomeId);
        deleteDocumentNonBlocking(incomeRef);
        toast({
            title: 'Receita excluída!',
            description: 'Sua receita foi removida com sucesso.'
        });
        setDeletingIncomeId(null);
    };

  return (
    <>
    {editingIncome && (
      <EditIncomeDialog
          income={editingIncome}
          open={!!editingIncome}
          onOpenChange={(open) => !open && setEditingIncome(null)}
      />
    )}
    
    <AlertDialog
        open={!!deletingIncomeId}
        onOpenChange={(open) => !open && setDeletingIncomeId(null)}
    >
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a receita.
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
          <h1 className="text-3xl font-bold font-headline">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas fontes de renda.</p>
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
          <AddIncomeDialog>
            <Button className="w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Receita
            </Button>
          </AddIncomeDialog>
        </div>
      </div>
      
       <div className="space-y-4">
         {isLoading ? (
           Array.from({ length: 3 }).map((_, i) => (
             <Card key={i}>
               <CardContent className="p-4 space-y-3">
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-5 w-1/3" />
                 <Skeleton className="h-5 w-1/4" />
               </CardContent>
             </Card>
           ))
         ) : filteredIncomes.length > 0 ? (
           filteredIncomes.map((income) => (
            <Card key={income.id} className="w-full">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold capitalize pr-2">{income.tipo}</h3>
                    {income.descricao && (
                      <p className="text-sm text-muted-foreground italic">{income.descricao}</p>
                    )}
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
                          <DropdownMenuItem onClick={() => setEditingIncome(income)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                              className="text-red-600 focus:text-red-500 focus:bg-red-50"
                              onClick={() => setDeletingIncomeId(income.id)}
                          >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold text-base">{formatCurrency(income.valor)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={income.status === 'pago' ? 'success' : 'destructive'}>
                      {income.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Data de Recebimento:</span>
                  <span>{formatDate(income.dataRecebimento)}</span>
                </div>
              </CardContent>
            </Card>
           ))
         ) : (
           <Card>
             <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
               <p>Nenhuma receita para este mês.</p>
             </CardContent>
           </Card>
         )}
       </div>

    </div>
    </>
  );
}
