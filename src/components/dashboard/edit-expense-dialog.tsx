'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Expense } from '@/lib/types';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  descricao: z.string().min(2, { message: 'Descrição deve ter pelo menos 2 caracteres.' }),
  valor: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  categoria: z.string().min(1, { message: 'Selecione uma categoria.' }),
  recorrente: z.boolean().default(false),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Mês deve estar no formato AAAA-MM.' }),
  status: z.enum(['pago', 'pendente']).default('pendente'),
  dataPagamento: z.coerce.date().optional(),
});

const categories = ['Moradia', 'Alimentação', 'Transporte', 'Contas', 'Lazer', 'Saúde', 'Compras', 'Outros'];

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({ expense, open, onOpenChange }: EditExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        ...expense,
        dataPagamento: expense.dataPagamento ? expense.dataPagamento.toDate() : undefined,
      });
    }
  }, [expense, form, open]);

  const status = form.watch('status');
  useEffect(() => {
      if (status === 'pago') {
          if (!form.getValues('dataPagamento')) {
              form.setValue('dataPagamento', new Date());
          }
      } else {
          form.setValue('dataPagamento', undefined);
      }
  }, [status, form]);


  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (!user || !expense) {
      toast({ title: 'Erro', description: 'Dados inválidos para atualização.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      const expenseDocRef = doc(db, 'users', user.uid, 'expenses', expense.id);
      const dataToUpdate = {
        ...values,
        dataPagamento: values.dataPagamento ? Timestamp.fromDate(values.dataPagamento) : null,
      };
      // Type assertion because updateDoc doesn't like `undefined` but it works to delete a field.
      // Firestore will remove the field if the value is undefined. `null` is also an option.
      updateDocumentNonBlocking(expenseDocRef, dataToUpdate as any);

      toast({
        title: 'Sucesso!',
        description: 'Despesa atualizada.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating expense: ", error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a despesa.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da despesa.
          </DialogDescription>
        </DialogHeader>
        {expense && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Aluguel" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Valor</FormLabel>
                          <FormControl>
                              <Input type="number" step="0.01" placeholder="0,00" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                  <FormField
                      control={form.control}
                      name="categoria"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}
                      />
              </div>
              <FormField
                  control={form.control}
                  name="mesReferencia"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Mês de Referência</FormLabel>
                      <FormControl>
                          <Input type="month" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
               <div className="flex items-center space-x-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                            <FormControl>
                                <Switch
                                checked={field.value === 'pago'}
                                onCheckedChange={(checked) => field.onChange(checked ? 'pago' : 'pendente')}
                                />
                            </FormControl>
                            <FormLabel className="font-normal">
                                Já foi pago?
                            </FormLabel>
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="dataPagamento"
                        render={({ field }) => (
                        <FormItem className={cn('flex flex-col', status !== 'pago' && 'hidden')}>
                            <FormLabel>Data de Pagamento</FormLabel>
                            <FormControl>
                            <Input type="date" 
                                onChange={(e) => field.onChange(e.target.valueAsDate)}
                                value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              <div className="flex items-center justify-between">
                  <FormField
                  control={form.control}
                  name="recorrente"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      <FormLabel className="font-normal">
                          É recorrente?
                      </FormLabel>
                      </FormItem>
                  )}
                  />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
