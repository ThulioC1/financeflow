'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Smartphone, Download } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
});

const photoSchema = z.object({
    photoURL: z.string().url({ message: "Por favor, insira uma URL válida." }).or(z.literal('')),
});


export default function PerfilPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [loadingName, setLoadingName] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const nameForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.displayName || '',
    },
  });

  const photoForm = useForm<z.infer<typeof photoSchema>>({
    resolver: zodResolver(photoSchema),
    values: {
      photoURL: user?.photoURL || '',
    }
  });

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const onNameSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !auth.currentUser) return;
    setLoadingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: values.name });
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { nome: values.name });
      toast({
        title: 'Sucesso!',
        description: 'Seu nome foi atualizado.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar seu nome.',
        variant: 'destructive',
      });
    } finally {
      setLoadingName(false);
    }
  };

  const onPhotoSubmit = async (values: z.infer<typeof photoSchema>) => {
    if (!user || !auth.currentUser) return;
    setLoadingPhoto(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: values.photoURL || null });
      toast({
        title: 'Sucesso!',
        description: 'Sua foto de perfil foi atualizada.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar sua foto de perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPhoto(false);
    }
  };

  if (isUserLoading) {
    return <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mt-10" />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="text-3xl font-bold font-headline text-slate-900 dark:text-white">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações da conta.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 overflow-hidden border-none shadow-md ring-1 ring-border">
          <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-xl">Informações da Conta</CardTitle>
              <CardDescription>Dados visíveis no seu perfil e notificações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-left text-center">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                      <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} />
                      <AvatarFallback className="text-3xl bg-primary/5 text-primary">{getInitials(user?.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className='flex-1'>
                      <p className="text-2xl font-bold font-headline">{user?.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
              </div>

              <Separator />

              <div className="grid gap-8 md:grid-cols-2">
                <Form {...photoForm}>
                    <form onSubmit={photoForm.handleSubmit(onPhotoSubmit)} className="space-y-4">
                      <FormField
                          control={photoForm.control}
                          name="photoURL"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>URL da Foto de Perfil</FormLabel>
                              <FormControl>
                              <Input placeholder="https://exemplo.com/sua-foto.jpg" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <div className="flex items-center gap-2">
                          <Button type="submit" disabled={loadingPhoto} className="flex-1">
                              {loadingPhoto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Salvar Foto
                          </Button>
                          <Button type="button" asChild variant="outline">
                              <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer">
                                  <Upload className="h-4 w-4" />
                              </a>
                          </Button>
                      </div>
                    </form>
                </Form>

                <Form {...nameForm}>
                    <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4">
                        <FormField
                        control={nameForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                                <Input placeholder="Seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" disabled={loadingName} className="w-full">
                        {loadingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Atualizar Nome
                        </Button>
                    </form>
                </Form>
              </div>
          </CardContent>
        </Card>

        {/* Card de Download do APK */}
        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">App Android</CardTitle>
                <CardDescription>Instale o APK no seu dispositivo.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Leve o <strong>Ca$hOrd</strong> sempre com você. Baixe nossa versão mobile para Android e tenha controle total das suas finanças na palma da mão.
            </p>
            <Button 
              asChild 
              className="w-full shadow-lg shadow-primary/20"
              variant="default"
            >
              <a 
                href="https://dub.sh/M0e5D3a" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar Aplicativo (APK)
              </a>
            </Button>
            <p className="text-[10px] text-center text-muted-foreground opacity-60">
              O link abrirá no seu navegador externo para iniciar o download.
            </p>
          </CardContent>
        </Card>

        {/* Card de Segurança/Informações */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Informações</CardTitle>
            <CardDescription>Detalhes do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm py-2 border-b border-dashed">
              <span className="text-muted-foreground">ID do Usuário:</span>
              <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded truncate max-w-[150px]">{user?.uid}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2 border-b border-dashed">
              <span className="text-muted-foreground">Plataforma:</span>
              <span className="font-medium">Web / PWA</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2">
              <span className="text-muted-foreground">Estado do Sistema:</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-emerald-600">Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
