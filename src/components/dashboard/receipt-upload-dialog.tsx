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

/**
 * Orcamento total do OCR. A primeira leitura baixa ~15MB de traineddata do CDN,
 * entao o limite e folgado — mas precisa existir: o `createWorker` do tesseract.js
 * tem um `.catch(() => {})` no bootstrap e, se o worker nao subir, a promise
 * simplesmente nunca resolve. Sem isso a UI fica travada em "preparando" para sempre.
 */
const OCR_TIMEOUT_MS = 90_000;

/** Rotulos de progresso. O status tambem vira texto, para o usuario ver que a vida esta seguem. */
const OCR_STAGES: Record<string, string> = {
  'loading tesseract core': 'Baixando o motor de OCR...',
  'initializing tesseract': 'Inicializando o motor...',
  'loading language traineddata': 'Baixando o idioma (pt)...',
  'loaded language traineddata': 'Idioma pronto.',
  'initializing api': 'Preparando o reconhecimento...',
  'recognizing text': 'Lendo o comprovante...',
};

/** Rejeita se a promise nao resolver dentro de `ms`, em vez de travar a tela. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
  const [stage, setStage] = useState('Preparando o OCR...');
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
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
    setStage('Preparando o OCR...');
    setOcrText(null);
    setScanError(null);
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFilePicker = () => fileInputRef.current?.click();

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
    setScanError(null);
    setOcrText(null);
    setProgress(0);
    setStage('Preparando o OCR...');

    try {
      const { base64, previewUrl: url } = await optimizeImage(file);
      setPreviewUrl(url);

      // Import dinamico: tesseract.js usa APIs de browser e nao deve entrar no bundle do servidor.
      setStage('Carregando a biblioteca de OCR...');
      const { createWorker } = await import('tesseract.js');

      setStage('Baixando o motor de OCR...');
      const worker = await withTimeout(
        createWorker('por', 1, {
          logger: (m: { status: string; progress: number }) => {
            const label = OCR_STAGES[m.status];
            if (label) setStage(label);
            // O progresso so avanca na fase de leitura; nas de download nao ha
            // porcentagem confiavel, entao mantem o ultimo valor em vez de zerar.
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        }),
        OCR_TIMEOUT_MS,
        'O OCR não respondeu a tempo. Verifique a conexão e tente de novo.',
      );

      let text = '';
      try {
        const { data } = await withTimeout(
          worker.recognize(base64),
          OCR_TIMEOUT_MS,
          'A leitura do comprovante estourou o tempo limite.',
        );
        text = data?.text ?? '';
      } finally {
        await worker.terminate();
      }

      setOcrText(text);

      if (!text.trim()) {
        throw new Error('Nenhum texto reconhecido na imagem.');
      }

      const result = parseReceiptText(text);

      // Sempre abre o formulario editavel: mesmo sem valor, o usuario precisa poder
      // preencher a mao. Antes deste `setScanned` o dialog ficava travado num limbo
      // (preview visivel, formulario nunca aparecendo).
      setScanned(result);
      form.reset({
        descricao: result.descricao,
        valor: result.valor,
        categoria: result.categoria,
        dataPagamento: parseLocalDate(result.dataTransacao) ?? new Date(),
      });

      if (result.valor <= 0) {
        toast({
          title: 'Valor não encontrado',
          description:
            'O OCR leu o comprovante, mas não achou um valor válido. Preencha o valor manualmente.',
        });
      } else if (result.confianca === 'baixa') {
        toast({
          title: 'Leitura com baixa confiança',
          description: 'Confira o valor antes de aprovar — o OCR pode ter errado.',
        });
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Erro desconhecido ao ler a imagem.';
      console.error('[comprovante] falha na leitura do OCR:', error);
      setScanError(message);
      toast({
        title: 'Não foi possível ler o comprovante',
        description: message,
        variant: 'destructive',
        duration: 10000,
      });
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
        // Fechar no meio do OCR descartaria o download de ~15MB em andamento.
        if (!isOpen && analyzing) return;
        if (!isOpen) resetState();
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Fora do DialogContent: o Radix desmonta a subtree ao fechar, e o evento `change` se perde. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <DialogContent
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => {
          // Perder o meio do OCR (download de ~15MB) nao pode custar o trabalho.
          if (analyzing) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (analyzing) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Ler comprovante
          </DialogTitle>
          <DialogDescription>
            Envie a imagem do Pix ou débito. O app lê o valor, e você confirma antes de lançar.
          </DialogDescription>
        </DialogHeader>

        {!scanned && !analyzing && (
          <Button variant="outline" className="w-full" onClick={openFilePicker}>
            <Upload className="mr-2 h-4 w-4" />
            Escolher imagem do comprovante
          </Button>
        )}

        {analyzing && (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {stage}
                {progress > 0 ? ` ${progress}%` : ''}
              </p>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              O reconhecimento roda no seu aparelho. A primeira leitura baixa os dados do idioma.
            </p>
          </div>
        )}

        {/* Erro persistente: o toast expira em segundos e o sintoma era "nada aconteceu". */}
        {scanError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha na leitura</AlertTitle>
            <AlertDescription>
              <p>{scanError}</p>
              {ocrText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">
                    Ver o texto que o OCR leu ({ocrText.length} caracteres)
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-snug">
                    {ocrText}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
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
                    onClick={openFilePicker}
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