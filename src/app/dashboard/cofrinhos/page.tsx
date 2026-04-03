'use client';

import { useState } from 'react';
import { 
  PiggyBank as PiggyIcon, 
  Plus, 
  Target, 
  TrendingUp, 
  TrendingDown,
  MoreHorizontal, 
  Trash2,
  Edit,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase 
} from '@/firebase';
import { 
  collection, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import type { PiggyBank } from '@/lib/types';
import { useRouter } from 'next/navigation';

const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-violet-500',
];

export default function CofrinhosPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<PiggyBank | null>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const banksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'piggy_banks');
  }, [db, user]);

  const { data: banks, isLoading } = useCollection<PiggyBank>(banksQuery);

  const handleFinishAction = (message: string) => {
    toast({ title: message });
    // Refresh imediato e limpeza manual de scroll caso o Radix trave
    setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      router.refresh();
    }, 100);
  };

  const handleCreateBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const valorObjetivo = Number(formData.get('valorObjetivo'));
    const cor = COLORS[Math.floor(Math.random() * COLORS.length)];

    if (!nome || isNaN(valorObjetivo)) return;

    const id = crypto.randomUUID();
    const ref = doc(db, 'users', user.uid, 'piggy_banks', id);

    const data = {
      id,
      userId: user.uid,
      nome,
      valorObjetivo,
      valorAtual: 0,
      cor,
      createdAt: serverTimestamp(),
    };

    setDocumentNonBlocking(ref, data, {});
    setIsAddOpen(false);
    handleFinishAction("Cofrinho criado com sucesso!");
  };

  const handleEditBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedBank) return;

    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const valorObjetivo = Number(formData.get('valorObjetivo'));

    if (!nome || isNaN(valorObjetivo)) return;

    const ref = doc(db, 'users', user.uid, 'piggy_banks', selectedBank.id);
    updateDocumentNonBlocking(ref, {
      nome,
      valorObjetivo
    });

    setIsEditOpen(false);
    setSelectedBank(null);
    handleFinishAction("Cofrinho atualizado!");
  };

  const handleDeposit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedBank) return;

    const formData = new FormData(e.currentTarget);
    const valor = Number(formData.get('valor'));

    if (isNaN(valor) || valor <= 0) return;

    const ref = doc(db, 'users', user.uid, 'piggy_banks', selectedBank.id);
    updateDocumentNonBlocking(ref, {
      valorAtual: selectedBank.valorAtual + valor
    });

    setIsDepositOpen(false);
    setSelectedBank(null);
    handleFinishAction(`R$ ${valor.toFixed(2)} guardados!`);
  };

  const handleWithdraw = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedBank) return;

    const formData = new FormData(e.currentTarget);
    const valor = Number(formData.get('valor'));

    if (isNaN(valor) || valor <= 0) return;
    
    if (valor > selectedBank.valorAtual) {
      toast({ 
        title: "Saldo insuficiente", 
        description: "Você não pode retirar um valor maior do que o saldo atual.",
        variant: "destructive"
      });
      return;
    }

    const ref = doc(db, 'users', user.uid, 'piggy_banks', selectedBank.id);
    updateDocumentNonBlocking(ref, {
      valorAtual: selectedBank.valorAtual - valor
    });

    setIsWithdrawOpen(false);
    setSelectedBank(null);
    handleFinishAction(`R$ ${valor.toFixed(2)} retirados.`);
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'piggy_banks', id));
    handleFinishAction("Cofrinho removido.");
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Cofrinhos</h1>
          <p className="text-muted-foreground">Guarde dinheiro para seus sonhos e objetivos.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cofrinho
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateBank}>
              <DialogHeader>
                <DialogTitle>Criar Novo Cofrinho</DialogTitle>
                <DialogDescription>Defina o nome do seu objetivo e quanto deseja poupar.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Objetivo</Label>
                  <Input id="nome" name="nome" placeholder="Ex: Viagem de Férias" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valorObjetivo">Valor Meta (R$)</Label>
                  <Input id="valorObjetivo" name="valorObjetivo" type="number" step="0.01" placeholder="0.00" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Começar a Poupar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : banks && banks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => {
            const progress = Math.min((bank.valorAtual / bank.valorObjetivo) * 100, 100);
            return (
              <Card key={bank.id} className="relative overflow-hidden group hover:shadow-lg transition-all">
                <div className={`absolute top-0 left-0 w-full h-1 ${bank.cor}`} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <PiggyIcon className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedBank(bank); setIsEditOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bank.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="mt-4 font-headline text-lg">{bank.nome}</CardTitle>
                  <CardDescription>Meta: {formatCurrency(bank.valorObjetivo)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{progress.toFixed(0)}% concluído</span>
                      <span className="text-primary">{formatCurrency(bank.valorAtual)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" 
                      onClick={() => { setSelectedBank(bank); setIsDepositOpen(true); }}
                    >
                      <TrendingUp className="mr-2 h-3 w-3" />
                      Poupar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20" 
                      onClick={() => { setSelectedBank(bank); setIsWithdrawOpen(true); }}
                      disabled={bank.valorAtual <= 0}
                    >
                      <TrendingDown className="mr-2 h-3 w-3" />
                      Retirar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl border-muted-foreground/20">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Target className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold font-headline">Nenhum cofrinho ainda</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            Comece a planejar seus sonhos criando seu primeiro cofrinho hoje mesmo.
          </p>
          <Button variant="link" className="mt-4" onClick={() => setIsAddOpen(true)}>
            Criar meu primeiro cofrinho
          </Button>
        </div>
      )}

      {/* Dialog para Edição */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if(!open) setSelectedBank(null); }}>
        <DialogContent>
          <form onSubmit={handleEditBank}>
            <DialogHeader>
              <DialogTitle>Editar Cofrinho</DialogTitle>
              <DialogDescription>Altere o nome ou a meta do seu objetivo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_nome">Nome do Objetivo</Label>
                <Input id="edit_nome" name="nome" defaultValue={selectedBank?.nome} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_valorObjetivo">Valor Meta (R$)</Label>
                <Input id="edit_valorObjetivo" name="valorObjetivo" type="number" step="0.01" defaultValue={selectedBank?.valorObjetivo} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Depósito */}
      <Dialog open={isDepositOpen} onOpenChange={(open) => { setIsDepositOpen(open); if(!open) setSelectedBank(null); }}>
        <DialogContent>
          <form onSubmit={handleDeposit}>
            <DialogHeader>
              <DialogTitle>Adicionar ao Cofrinho</DialogTitle>
              <DialogDescription>Quanto você quer guardar no objetivo "{selectedBank?.nome}"?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor do Depósito (R$)</Label>
                <div className="relative">
                  <ArrowUpCircle className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500" />
                  <Input id="valor" name="valor" type="number" step="0.01" className="pl-9" placeholder="0.00" required autoFocus />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Confirmar Depósito</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Retirada */}
      <Dialog open={isWithdrawOpen} onOpenChange={(open) => { setIsWithdrawOpen(open); if(!open) setSelectedBank(null); }}>
        <DialogContent>
          <form onSubmit={handleWithdraw}>
            <DialogHeader>
              <DialogTitle>Retirar do Cofrinho</DialogTitle>
              <DialogDescription>Quanto você quer retirar de "{selectedBank?.nome}"?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="valor_withdraw">Valor da Retirada (R$)</Label>
                <div className="relative">
                  <ArrowDownCircle className="absolute left-3 top-2.5 h-4 w-4 text-rose-500" />
                  <Input id="valor_withdraw" name="valor" type="number" step="0.01" className="pl-9" placeholder="0.00" required autoFocus />
                </div>
                <p className="text-xs text-muted-foreground">Saldo disponível: {selectedBank ? formatCurrency(selectedBank.valorAtual) : 'R$ 0,00'}</p>
              </div>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  if (!selectedBank || !user) return;
                  const ref = doc(db, 'users', user.uid, 'piggy_banks', selectedBank.id);
                  updateDocumentNonBlocking(ref, { valorAtual: 0 });
                  setIsWithdrawOpen(false);
                  setSelectedBank(null);
                  handleFinishAction("Resgate total realizado!");
                }}
              >
                Retirar Tudo ({selectedBank ? formatCurrency(selectedBank.valorAtual) : 'R$ 0,00'})
              </Button>
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive">Confirmar Retirada</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
