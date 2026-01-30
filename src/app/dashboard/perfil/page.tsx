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
import { Loader2 } from 'lucide-react';
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
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName: values.name });

      // Update Firestore document
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e foto.</p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
            <CardDescription>Atualize seus dados e foto de perfil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(user?.displayName)}</AvatarFallback>
                </Avatar>
                <div className='text-center'>
                    <p className="text-lg font-semibold">{user?.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
            </div>

            <Separator />

            <Form {...photoForm}>
                <form onSubmit={photoForm.handleSubmit(onPhotoSubmit)} className="space-y-4 max-w-sm mx-auto">
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
                <Button type="submit" disabled={loadingPhoto}>
                    {loadingPhoto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Foto
                </Button>
                </form>
            </Form>

            <Separator />

            <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4 max-w-sm mx-auto">
                    <FormField
                    control={nameForm.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" disabled={loadingName}>
                    {loadingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Nome
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
