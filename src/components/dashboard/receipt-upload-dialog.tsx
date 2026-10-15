'use client';

import { useRef, useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Loader2, ScanLine, Upload, RefreshCw, AlertTriangle, FileWarning } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  parseReceiptText,
  RECEIPT_CATEGORIES,
  type ParsedReceipt,
} from '@/lib/receipt-parser';
import { format } from 'date-fns';

/** OCR precisa de mais resolução do que visão de IA — aqui o custo é tempo de CPU, não tokens. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.92;

const receiptFormSchema = z.object({
  descricao: z.string().min(2, { message: 'Descrição deve ter pelo menos 2 caracteres.' }),
  valor: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  categoria: z.string().min(1, { message: 'Selecione uma categoria.' }),
  dataPagamento: z.date({ required_error: 'Informe a data da transação.' }),
});

/**
 * Reduz e converte a imagem para JPEG, retornando base64 (sem prefixo) e data URL para preview.
 */
function optimizeImage(file: File): Promise<{ base64: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Formato de imagem não suportado pelo navegador.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({ base64: dataUrl.split(',')[1], previewUrl: dataUrl });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/** Ancora a data no meio-dia para evitar deslocamento de fuso horário. */
function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

const toMonthReference = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatMonthReference = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 12);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export function ReceiptUploadDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ParsedReceipt | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof receiptFormSchema>>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: { descricao: '', valor: 0, categoria: '', dataPagamento: new Date() },
  });

  const resetState = () => {
    form.reset({ descricao: '', valor: 0, categoria: '', dataPagamento: new Date() });
    setPreviewUrl(null);
    setScanned(null);
    setAnalyzing(false);
    setProgress(0);
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Envie uma imagem (PNG, JPG ou WEBP) do comprovante.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setScanned(null);
    setProgress(0);

    try {
      const { base64, previewUrl: url } = await optimizeImage(file);
      setPreviewUrl(url);

      // Import dinâmico: tesseract.js usa APIs de browser e não deve entrar no bundle do servidor.
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      let ocrText = '';
      try {
        const { data } = await worker.recognize(base64);
        ocrText = data?.text ?? '';
      } finally {
        await worker.terminate();
      }

      if (!ocrText.trim()) {
        throw new Error('Nenhum texto reconhecido na imagem.');
      }

      const result = parseReceiptText(ocrText);

      if (result.valor <= 0) {
        toast({
          title: 'Valor não encontrado',
          description:
            'O OCR leu o comprovante, mas não achou um valor válido. Tente uma foto mais nítida ou preencha manualmente.',
        });
        form.reset({
          descricao: result.descricao,
          valor: 0,
          categoria: result.categoria,
          dataPagamento: parseLocalDate(result.dataTransacao) ?? new Date(),
        });
        return;
      }

      setScanned(result);
      form.reset({
        descricao: result.descricao,
        valor: result.valor,
        categoria: result.categoria,
        dataPagamento: parseLocalDate(result.dataTransacao) ?? new Date(),
      });

      if (result.confianca === 'baixa') {
        toast({
          title: 'Leitura com baixa confiança',
          description: 'Confira o valor antes de aprovar — o OCR pode ter errado.',
        });
      }
    } catch (error) {
      console.error('Error reading receipt: ', error);
      toast({
        title: 'Não foi possível ler o comprovante',
        description:
          error instanceof Error && error.message === 'Nenhum texto reconhecido na imagem.'
            ? 'A imagem não tinha texto legível. Tente uma foto mais nítida.'
            : 'Tente outra imagem. Se o erro persistir, reinstale as dependências (npm install).',
        variant: 'destructive',
      });
      setPreviewUrl(null);
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const onSubmit = (values: z.infer<typeof receiptFormSchema>) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      const newId = crypto.randomUUID();
      const mesReferencia = toMonthReference(values.dataPagamento);
      const expenseRef = doc(db, 'users', user.uid, 'expenses', newId);

      setDocumentNonBlocking(
        expenseRef,
        {
          id: newId,
          userId: user.uid,
          descricao: values.descricao,
          valor: values.valor,
          categoria: values.categoria,
          recorrente: false,
          mesReferencia,
          status: 'pago',
          dataPagamento: Timestamp.fromDate(values.dataPagamento),
          dataVencimento: null,
          createdAt: serverTimestamp(),
        },
        {}
      );

      toast({
        title: 'Despesa confirmada!',
        description: `Lançada em ${mesReferencia} e descontada do seu saldo.`,
      });
      setOpen(false);
    } catch (error) {
      console.error('Error saving expense from receipt: ', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a despesa.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = form.watch('dataPagamento');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Ler comprovante
          </DialogTitle>
          <DialogDescription>
            Envie a imagem do Pix ou débito. O app lê o valor, e você confirma antes de lançar.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {!scanned && !analyzing && (
          <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Escolher imagem do comprovante
          </Button>
        )}

        {analyzing && (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {progress > 0 ? `Lendo o comprovante... ${progress}%` : 'Preparando o OCR...'}
              </p>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              O reconhecimento roda no seu aparelho. A primeira leitura baixa os dados do idioma.
            </p>
          </div>
        )}

        {previewUrl && (
          <div className="relative overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Comprovante enviado"
              className="max-h-48 w-full bg-muted object-contain"
            />
          </div>
        )}

        {scanned && (
          <>
            {scanned.confianca !== 'alta' && (
              <Alert variant={scanned.confianca === 'baixa' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {scanned.confianca === 'baixa'
                    ? 'Leitura com baixa confiança'
                    : 'Confira os dados'}
                </AlertTitle>
                <AlertDescription>
                  O OCR pode ter lido o valor errado. Revise antes de aprovar.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Supermercado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
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
                            {RECEIPT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataPagamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(parseLocalDate(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Será lançado como <strong>pago</strong> em{' '}
                    <strong>
                      {selectedDate ? formatMonthReference(toMonthReference(selectedDate)) : '—'}
                    </strong>{' '}
                    e descontado do saldo. A imagem não é guardada.
                  </span>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reenviar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aprovar e descontar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}