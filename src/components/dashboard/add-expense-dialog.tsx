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

const expenseSchema = z.object({
  descricao: z.string().min(2, { message: 'Descrição deve ter pelo menos 2 caracteres.' }),
  valor: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  categoria: z.string().min(1, { message: 'Selecione uma categoria.' }),
  recorrente: z.boolean().default(false),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Mês deve estar no formato AAAA-MM.' }),
  status: z.enum(['pago', 'pendente']).default('pendente'),
  dataPagamento: z.coerce.date().optional().nullable(),
});

const categories = ['Moradia', 'Alimentação', 'Transporte', 'Contas', 'Lazer', 'Saúde', 'Compras', 'Outros'];

export function AddExpenseDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      descricao: '',
      valor: 0,
      categoria: '',
      recorrente: false,
      mesReferencia: new Date().toISOString().slice(0, 7),
      status: 'pendente',
      dataPagamento: null,
    },
  });

  // Watch for status changes to set dataPagamento
  const status = form.watch('status');
  useEffect(() => {
    if (status === 'pago') {
      // If date is not set, set it to today
      if (!form.getValues('dataPagamento')) {
        form.setValue('dataPagamento', new Date());
      }
    } else {
      // If status is pendente, clear the date
      form.setValue('dataPagamento', null);
    }
  }, [status, form]);

  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      const newId = crypto.randomUUID();
      const expenseData = {
        ...values,
        id: newId,
        userId: user.uid,
        createdAt: serverTimestamp(),
        dataPagamento: values.dataPagamento ? Timestamp.fromDate(values.dataPagamento) : null,
      };
      
      const expenseDocRef = doc(db, 'users', user.uid, 'expenses', newId);
      setDocumentNonBlocking(expenseDocRef, expenseData, {});

      toast({
        title: 'Sucesso!',
        description: 'Despesa adicionada.',
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error adding expense: ", error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar a despesa.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            form.reset({
              descricao: '',
              valor: 0,
              categoria: '',
              recorrente: false,
              mesReferencia: new Date().toISOString().slice(0, 7),
              status: 'pendente',
              dataPagamento: null
            });
        }
        setOpen(isOpen);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Despesa</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da nova despesa.
          </DialogDescription>
        </DialogHeader>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <div className="flex items-center">
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
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
