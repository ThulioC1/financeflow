import { AuthForm } from '@/components/auth/auth-form';
import { Logo } from '@/components/icons';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Logo className="mb-4 h-12 w-12" />
          <h1 className="text-3xl font-bold font-headline text-foreground">
            Bem-vindo de volta!
          </h1>
          <p className="text-muted-foreground">
            Faça login para gerenciar suas finanças.
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
