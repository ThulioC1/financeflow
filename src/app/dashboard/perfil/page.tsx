'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useAuth, useFirebase, useFirestore } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
});

export default function PerfilPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { firebaseApp } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();

  const [loadingName, setLoadingName] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.displayName || '',
    },
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    if (!user || !auth.currentUser) return;

    setLoadingPhoto(true);

    try {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      // Get download URL
      const photoURL = await getDownloadURL(snapshot.ref);

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { photoURL });
      
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
        <p className="text-muted-foreground">Gerencie suas informações pessoais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>Atualize sua foto de perfil.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} />
              <AvatarFallback className="text-3xl">{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
            <Button
              asChild
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8"
            >
              <label htmlFor="photo-upload">
                {loadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span className="sr-only">Trocar foto</span>
                <input id="photo-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={loadingPhoto}/>
              </label>
            </Button>
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.displayName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize seu nome.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onNameSubmit)} className="space-y-4 max-w-sm">
              <FormField
                control={form.control}
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
