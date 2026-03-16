
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
  Repeat,
  ExternalLink,
  Edit2
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

interface ExternalCalendar {
  id: string;
  userId: string;
  name: string;
  url: string;
  createdAt: any;
}

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExternalDialogOpen, setIsExternalDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingExternal, setEditingExternal] = useState<ExternalCalendar | null>(null);
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'events');
  }, [db, user]);

  const externalQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'external_calendars');
  }, [db, user]);

  const { data: events, isLoading } = useCollection<CalendarEvent>(eventsQuery);
  const { data: externalCalendars, isLoading: isExternalLoading } = useCollection<ExternalCalendar>(externalQuery);

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

    const durationInDays = differenceInDays(eventEnd, eventStart);
    const diffInDays = differenceInDays(targetDay, eventStart);

    if (diffInDays < 0) return false;

    if (event.recurrence === 'none') {
      return diffInDays <= durationInDays;
    }

    if (event.recurrence === 'daily') {
      return true;
    }

    if (event.recurrence === 'weekly') {
      return (diffInDays % 7) <= durationInDays;
    }

    if (event.recurrence === 'biweekly') {
      return (diffInDays % 14) <= durationInDays;
    }

    if (event.recurrence === 'yearly') {
      const targetMonth = targetDay.getMonth();
      const targetDate = targetDay.getDate();
      const startMonth = eventStart.getMonth();
      const startDate = eventStart.getDate();
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
    const endLocalDateStr = formData.get('endDate') as string;

    if (!title || !startTime || !endTime || !endLocalDateStr) return;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const [startYear, startMonth, startDay] = format(selectedDate, 'yyyy-MM-dd').split('-').map(Number);
    const [endYear, endMonth, endDay] = endLocalDateStr.split('-').map(Number);

    const eventStartDate = new Date(startYear, startMonth - 1, startDay, startH, startM);
    const eventEndDate = new Date(endYear, endMonth - 1, endDay, endH, endM);

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
    toast({ title: editingEvent ? "Evento atualizado" : "Evento criado" });
    setIsAddDialogOpen(false);
    setEditingEvent(null);
  };

  const handleSaveExternal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const url = formData.get('url') as string;

    if (!name || !url) return;

    const id = editingExternal?.id || crypto.randomUUID();
    const ref = doc(db, 'users', user.uid, 'external_calendars', id);

    const data = {
      id,
      userId: user.uid,
      name,
      url,
      createdAt: editingExternal?.createdAt || serverTimestamp(),
    };

    setDocumentNonBlocking(ref, data, { merge: true });
    toast({ title: editingExternal ? "Agenda atualizada" : "Agenda adicionada" });
    setIsExternalDialogOpen(false);
    setEditingExternal(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'events', eventId));
    toast({ title: "Evento removido" });
  };

  const handleDeleteExternal = (id: string) => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'external_calendars', id));
    toast({ title: "Agenda externa removida" });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Agenda</h1>
          <p className="text-muted-foreground">Gerencie seus compromissos e agendas externas.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) { setEditingEvent(null); setRecurrence('none'); }
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
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" defaultValue={editingEvent?.title} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="startTime">Hora Início</Label><Input id="startTime" name="startTime" type="time" defaultValue={editingEvent ? format(editingEvent.startDate.toDate(), 'HH:mm') : '09:00'} required /></div>
                    <div className="grid gap-2"><Label htmlFor="endTime">Hora Fim</Label><Input id="endTime" name="endTime" type="time" defaultValue={editingEvent ? format(editingEvent.endDate.toDate(), 'HH:mm') : '10:00'} required /></div>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="endDate">Data de Término</Label><Input id="endDate" name="endDate" type="date" defaultValue={editingEvent ? format(editingEvent.endDate.toDate(), 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')} required /></div>
                  <div className="grid gap-2">
                    <Label htmlFor="recurrence">Repetir</Label>
                    <Select value={recurrence} onValueChange={(v: EventRecurrence) => setRecurrence(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não se repete</SelectItem>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="biweekly">Semana sim, semana não</SelectItem>
                        <SelectItem value="yearly">Anualmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="location">Localização</Label><Input id="location" name="location" defaultValue={editingEvent?.location} /></div>
                  <div className="grid gap-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={editingEvent?.description} /></div>
                </div>
                <DialogFooter><Button type="submit">Salvar Evento</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-headline capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>Hoje</Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            <div className="grid grid-cols-7 gap-px border-b sm:border-none bg-muted">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-background py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-muted overflow-hidden">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toString()} onClick={() => setSelectedDate(day)} className={cn("min-h-[80px] sm:min-h-[120px] bg-background p-1 sm:p-2 cursor-pointer transition-colors hover:bg-muted/50 relative", !isCurrentMonth && "text-muted-foreground bg-muted/20", isSelected && "bg-primary/5 ring-1 ring-inset ring-primary z-10")}>
                    <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium", isToday && "bg-primary text-primary-foreground", !isToday && isSelected && "text-primary")}>{format(day, 'd')}</span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div key={`${event.id}-${day.getTime()}`} className={cn("truncate text-[10px] sm:text-xs px-1 py-0.5 rounded border flex items-center gap-1", event.recurrence && event.recurrence !== 'none' ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-indigo-100 text-indigo-700 border-indigo-200")}>
                          {(event.recurrence && event.recurrence !== 'none') && <Repeat className="h-2 w-2" />}{event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compromissos</CardTitle>
              <CardDescription>{format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : selectedDayEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDayEvents.map(event => (
                    <div key={`${event.id}-${selectedDate.getTime()}`} className="group relative flex flex-col gap-2 p-3 rounded-lg border bg-card transition-all hover:shadow-md">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-sm flex items-center gap-2">{event.title}{event.recurrence && event.recurrence !== 'none' && <Repeat className="h-3 w-3 text-amber-500" />}</h4>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingEvent(event); setRecurrence(event.recurrence || 'none'); setIsAddDialogOpen(true); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><Clock className="h-3 w-3" /><span>{format(event.startDate.toDate(), 'HH:mm')} - {format(event.endDate.toDate(), 'HH:mm')}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-center text-muted-foreground py-12">Nenhum compromisso para hoje.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg">Agendas Externas</CardTitle>
                <CardDescription>Acompanhe agendas do Google via URL.</CardDescription>
              </div>
              <Dialog open={isExternalDialogOpen} onOpenChange={(open) => {
                  setIsExternalDialogOpen(open);
                  if (!open) setEditingExternal(null);
              }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveExternal}>
                    <DialogHeader>
                      <DialogTitle>{editingExternal ? 'Editar Agenda' : 'Nova Agenda Externa'}</DialogTitle>
                      <DialogDescription>Insira o URL público (iCal) da sua agenda do Google.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2"><Label htmlFor="name">Nome da Agenda</Label><Input id="name" name="name" defaultValue={editingExternal?.name} placeholder="Ex: Feriados ou Trabalho" required /></div>
                      <div className="grid gap-2"><Label htmlFor="url">URL da Agenda (iCal)</Label><Input id="url" name="url" defaultValue={editingExternal?.url} placeholder="https://calendar.google.com/..." required /></div>
                    </div>
                    <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isExternalLoading ? <Skeleton className="h-12 w-full" /> : externalCalendars && externalCalendars.length > 0 ? (
                <div className="space-y-3">
                  {externalCalendars.map(cal => (
                    <div key={cal.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 group">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{cal.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{cal.url}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingExternal(cal); setIsExternalDialogOpen(true); }}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteExternal(cal.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-center text-muted-foreground py-6">Nenhuma agenda externa adicionada.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
