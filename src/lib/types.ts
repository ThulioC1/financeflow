import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  createdAt: Timestamp;
}

export type IncomeType = 'quinzena 1' | 'quinzena 2' | 'extra';
export type EntryStatus = 'pendente' | 'pago';

export interface Income {
  id: string;
  userId: string;
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
