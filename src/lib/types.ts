
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  createdAt: Timestamp;
}

export type IncomeType = 'mensal' | 'quinzena 1' | 'quinzena 2' | 'extra';
export type EntryStatus = 'pendente' | 'pago';

export interface Income {
  id: string;
  userId: string;
  descricao?: string;
  valor: number;
  tipo: IncomeType;
  mesReferencia: string; // YYYY-MM
  status: EntryStatus;
  dataRecebimento?: Timestamp;
  createdAt: Timestamp;
}

export interface Expense {
  id: string;
  userId: string;
  descricao: string;
  valor: number;
  categoria: string;
  recorrente: boolean;
  mesReferencia: string; // YYYY-MM
  status: EntryStatus;
  createdAt: Timestamp;
  dataPagamento?: Timestamp;
  dataVencimento?: Timestamp;
  isProjected?: boolean;
}

export interface Balance {
  id: string;
  userId: string;
  mesReferencia: string; // YYYY-MM
  saldoInicial: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoFinal: number;
}

export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'yearly';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay: boolean;
  recurrence?: EventRecurrence;
  createdAt: Timestamp;
}
