'use client';

import { useState, useEffect } from 'react';
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
  DialogTrigger,
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
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

const incomeSchema = z.object({
  tipo: z.enum(['mensal', 'quinzena 1', 'quinzena 2', 'extra'], {required_error: "Selecione um tipo."}),
  valor: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Mês deve estar no formato AAAA-MM.' }),
  status: z.enum(['pago', 'pendente']).default('pendente'),
  dataRecebimento: z.coerce.date().optional().nullable(),
});

export function AddIncomeDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      valor: 0,
      mesReferencia: new Date().toISOString().slice(0, 7),
      status: 'pendente',
      dataRecebimento: null,
    },
  });

  const status = form.watch('status');
  useEffect(() => {
    if (status === 'pago') {
      if (!form.getValues('dataRecebimento')) {
        form.setValue('dataRecebimento', new Date());
      }
    } else {
      form.setValue('dataRecebimento', null);
    }
  }, [status, form]);

  const onSubmit = (values: z.infer<typeof incomeSchema>) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      const newId = crypto.randomUUID();
      const incomeData = {
        ...values,
        id: newId,
        userId: user.uid,
        createdAt: serverTimestamp(),
        dataRecebimento: values.dataRecebimento ? Timestamp.fromDate(values.dataRecebimento) : null,
      };
      
      const incomeDocRef = doc(db, 'users', user.uid, 'incomes', newId);
      setDocumentNonBlocking(incomeDocRef, incomeData, {});

      toast({
        title: 'Sucesso!',
        description: 'Receita adicionada.',
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error adding income: ", error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar a receita.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            form.reset({
              valor: 0,
              mesReferencia: new Date().toISOString().slice(0, 7),
              status: 'pendente',
              dataRecebimento: null,
              tipo: undefined,
            });
        }
        setOpen(isOpen);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Receita</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da nova receita.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="quinzena 1">Quinzena 1</SelectItem>
                                <SelectItem value="quinzena 2">Quinzena 2</SelectItem>
                                <SelectItem value="extra">Extra</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
                />
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
                    name="dataRecebimento"
                    render={({ field }) => (
                    <FormItem className={cn('flex flex-col', status !== 'pago' && 'hidden')}>
                        <FormLabel>Data de Recebimento</FormLabel>
                        <FormControl>
                            <Input 
                                type="date" 
                                {...field}
                                value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(e.target.valueAsDate)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
