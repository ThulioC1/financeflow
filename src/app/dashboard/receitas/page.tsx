'use client';

import { useState, useMemo } from 'react';
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
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { AddIncomeDialog } from "@/components/dashboard/add-income-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

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
        return allIncomes.filter(income => income.mesReferencia === selectedMonth);
    }, [allIncomes, selectedMonth]);

    const handleMarkAsPaid = (incomeId: string) => {
        if (!user) return;
        const incomeRef = doc(db, 'users', user.uid, 'incomes', incomeId);
        updateDocumentNonBlocking(incomeRef, { 
            status: 'pago',
            dataRecebimento: serverTimestamp() 
        });
        toast({
            title: 'Receita atualizada!',
            description: 'A receita foi marcada como paga.'
        });
    };

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Receitas</h1>
            <p className="text-muted-foreground">Gerencie suas fontes de renda.</p>
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
            <AddIncomeDialog>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Receita
                </Button>
            </AddIncomeDialog>
        </div>
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
            {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                             <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredIncomes.length > 0 ? (
                    filteredIncomes.map((income) => (
                        <TableRow key={income.id}>
                            <TableCell className="font-medium capitalize">{income.tipo}</TableCell>
                            <TableCell className="text-right">{formatCurrency(income.valor)}</TableCell>
                            <TableCell>
                                <Badge variant={income.status === 'pago' ? 'success' : 'destructive'}>
                                    {income.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatDate(income.dataRecebimento)}</TableCell>
                            <TableCell className="text-right">
                                {income.status === 'pendente' && (
                                    <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(income.id)}>Marcar como pago</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            Nenhuma receita encontrada para este mês.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
