import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  color: string;
}

export function StatCard({ title, value, icon: Icon, description, color }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-md ring-1 ring-slate-200/50 transition-all hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {value}
            </div>
          </div>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xl", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center pt-2">
          <p className="text-xs font-medium text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}