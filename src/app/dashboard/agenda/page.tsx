
'use client';

import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isAfter,
  isBefore,
  startOfDay,
  differenceInDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trash2,
  RefreshCw,
  Repeat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase 
} from '@/firebase';
import { 
  collection, 
  doc, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CalendarEvent, EventRecurrence } from '@/lib/types';

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'events');
  }, [db, user]);

  const { data: events, isLoading } = useCollection<CalendarEvent>(eventsQuery);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const checkEventOnDay = (event: CalendarEvent, day: Date) => {
    const eventStart = startOfDay(event.startDate.toDate());
    const eventEnd = startOfDay(event.endDate.toDate());
    const targetDay = startOfDay(day);

    // Duração do evento original em dias
    const durationInDays = differenceInDays(eventEnd, eventStart);
    
    // Dias desde o início do evento original
    const diffInDays = differenceInDays(targetDay, eventStart);

    if (diffInDays < 0) return false;

    if (event.recurrence === 'none') {
      return diffInDays <= durationInDays;
    }

    if (event.recurrence === 'daily') {
      return true;
    }

    if (event.recurrence === 'weekly') {
      // Verifica se o dia atual cai dentro da janela de duração em qualquer semana
      return (diffInDays % 7) <= durationInDays;
    }

    if (event.recurrence === 'biweekly') {
      // Lógica de "semana sim, semana não"
      // Um ciclo de 14 dias: os primeiros 'duration' dias do ciclo são ativos
      return (diffInDays % 14) <= durationInDays;
    }

    if (event.recurrence === 'yearly') {
      // Simplificado: verifica se o mês e dia batem (considerando a duração)
      const targetMonth = targetDay.getMonth();
      const targetDate = targetDay.getDate();
      const startMonth = eventStart.getMonth();
      const startDate = eventStart.getDate();
      
      // Para duração de 1 dia, apenas o dia exato. Para mais, precisaria de lógica complexa.
      return targetMonth === startMonth && targetDate === startDate;
    }

    return false;
  };

  const getEventsForDay = (day: Date) => {
    if (!events) return [];
    return events.filter(event => checkEventOnDay(event, day));
  };

  const selectedDayEvents = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [events, selectedDate]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const endLocalDate = formData.get('endDate') as string;

    if (!title || !startTime || !endTime || !endLocalDate) return;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const eventStartDate = new Date(selectedDate);
    eventStartDate.setHours(startH, startM);

    const eventEndDate = new Date(endLocalDate);
    eventEndDate.setHours(endH, endM);

    const eventId = editingEvent?.id || crypto.randomUUID();
    const eventRef = doc(db, 'users', user.uid, 'events', eventId);

    const eventData = {
      id: eventId,
      userId: user.uid,
      title,
      description,
      location,
      startDate: Timestamp.fromDate(eventStartDate),
      endDate: Timestamp.fromDate(eventEndDate),
      allDay: false,
      recurrence,
      createdAt: serverTimestamp(),
    };

    setDocumentNonBlocking(eventRef, eventData, { merge: true });
    
    toast({
      title: editingEvent ? "Evento atualizado" : "Evento criado",
      description: "Seu compromisso foi salvo com sucesso.",
    });

    setIsAddDialogOpen(false);
    setEditingEvent(null);
    setRecurrence('none');
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!user) return;
    const eventRef = doc(db, 'users', user.uid, 'events', eventId);
    deleteDocumentNonBlocking(eventRef);
    toast({
      title: "Evento removido",
      description: "O compromisso foi excluído da sua agenda.",
    });
  };

  const handleGoogleSync = () => {
    toast({
      title: "Sincronização com Google",
      description: "A integração com Google Calendar está em desenvolvimento.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Agenda</h1>
          <p className="text-muted-foreground">Gerencie seus compromissos e metas.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleGoogleSync} className="flex-1 sm:flex-none">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar Google
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setEditingEvent(null);
                setRecurrence('none');
              }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSaveEvent}>
                <DialogHeader>
                  <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
                  <DialogDescription>
                    Iniciando em: {format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" name="title" defaultValue={editingEvent?.title} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">Hora Início</Label>
                      <Input 
                        id="startTime" 
                        name="startTime" 
                        type="time" 
                        defaultValue={editingEvent ? format(editingEvent.startDate.toDate(), 'HH:mm') : '09:00'} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime">Hora Fim</Label>
                      <Input 
                        id="endTime" 
                        name="endTime" 
                        type="time" 
                        defaultValue={editingEvent ? format(editingEvent.endDate.toDate(), 'HH:mm') : '10:00'} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Data de Término</Label>
                    <Input 
                      id="endDate" 
                      name="endDate" 
                      type="date" 
                      defaultValue={editingEvent ? format(editingEvent.endDate.toDate(), 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')} 
                      required 
                    />
                    <p className="text-[10px] text-muted-foreground">Para eventos de um dia, mantenha a mesma data.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="recurrence">Repetir</Label>
                    <Select value={recurrence} onValueChange={(v: EventRecurrence) => setRecurrence(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a recorrência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não se repete</SelectItem>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="biweekly">Semana sim, semana não</SelectItem>
                        <SelectItem value="yearly">Anualmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Localização</Label>
                    <Input id="location" name="location" defaultValue={editingEvent?.location} placeholder="Onde?" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea id="description" name="description" defaultValue={editingEvent?.description} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar Evento</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-headline capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(new Date());
              }}>
                Hoje
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            <div className="grid grid-cols-7 gap-px border-b sm:border-none bg-muted">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-background py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-muted overflow-hidden">
              {calendarDays.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[80px] sm:min-h-[120px] bg-background p-1 sm:p-2 cursor-pointer transition-colors hover:bg-muted/50 relative group",
                      !isCurrentMonth && "text-muted-foreground bg-muted/20",
                      isSelected && "bg-primary/5 ring-1 ring-inset ring-primary z-10"
                    )}
                  >
                    <span className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      isToday && "bg-primary text-primary-foreground",
                      !isToday && isSelected && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div 
                          key={`${event.id}-${day.getTime()}`} 
                          className={cn(
                            "truncate text-[10px] sm:text-xs px-1 py-0.5 rounded border flex items-center gap-1",
                            event.recurrence && event.recurrence !== 'none' 
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-indigo-100 text-indigo-700 border-indigo-200"
                          )}
                        >
                          {(event.recurrence && event.recurrence !== 'none') && <Repeat className="h-2 w-2" />}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          + {dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Compromissos</CardTitle>
              <CardDescription>
                {format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : selectedDayEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDayEvents.map(event => (
                    <div 
                      key={`${event.id}-${selectedDate.getTime()}`}
                      className="group relative flex flex-col gap-2 p-3 rounded-lg border bg-card transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            {event.title}
                            {event.recurrence && event.recurrence !== 'none' && (
                              <Repeat className="h-3 w-3 text-amber-500" />
                            )}
                          </h4>
                          {event.recurrence && event.recurrence !== 'none' && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              Repete: {
                                event.recurrence === 'daily' ? 'Diariamente' :
                                event.recurrence === 'weekly' ? 'Semanalmente' : 
                                event.recurrence === 'biweekly' ? 'Semana sim, semana não' : 'Anualmente'
                              }
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => {
                              setEditingEvent(event);
                              setRecurrence(event.recurrence || 'none');
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3 rotate-45" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(event.startDate.toDate(), 'HH:mm')} - {format(event.endDate.toDate(), 'HH:mm')}
                            {differenceInDays(event.endDate.toDate(), event.startDate.toDate()) > 0 && (
                              <span className="ml-1 text-primary">
                                (+{differenceInDays(event.endDate.toDate(), event.startDate.toDate())}d)
                              </span>
                            )}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic border-l-2 pl-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Nenhum compromisso para hoje.</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    Adicionar agora
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
