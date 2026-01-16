'use client';

import { useState } from 'react';
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
import { Loader2, CalendarIcon } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const incomeSchema = z.object({
  tipo: z.enum(['quinzena 1', 'quinzena 2', 'extra'], {required_error: "Selecione um tipo."}),
  valor: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Mês deve estar no formato AAAA-MM.' }),
  status: z.enum(['pago', 'pendente']).default('pendente'),
  dataRecebimento: z.date().optional(),
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
    },
  });

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
        dataRecebimento: values.dataRecebimento ? Timestamp.fromDate(values.dataRecebimento) : undefined,
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
    <Dialog open={open} onOpenChange={setOpen}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                            onCheckedChange={(checked) => {
                                field.onChange(checked ? 'pago' : 'pendente');
                                if (checked) {
                                    form.setValue('dataRecebimento', new Date());
                                } else {
                                    form.setValue('dataRecebimento', undefined);
                                }
                            }}
                            />
                        </FormControl>
                        <FormLabel className="font-normal">
                            Já foi pago?
                        </FormLabel>
                        </FormItem>
                    )}
                    />

                {form.watch('status') === 'pago' && (
                    <FormField
                        control={form.control}
                        name="dataRecebimento"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[200px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                    ) : (
                                    <span>Data de Recebimento</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
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
