
'use server';

/**
 * @fileOverview IA Financial Advisor flow.
 *
 * - analyzeFinances - A function that provides strategic financial advice.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const FinancialAdvisorInputSchema = z.object({
  currentMonth: z.object({
    month: z.string(),
    totalIncome: z.number(),
    totalExpenses: z.number(),
    expensesByCategory: z.array(z.object({
      category: z.string(),
      amount: z.number()
    }))
  }),
  history: z.array(z.object({
    month: z.string(),
    balance: z.number()
  }))
});

export type FinancialAdvisorInput = z.infer<typeof FinancialAdvisorInputSchema>;

const FinancialAdvisorOutputSchema = z.object({
  summary: z.string().describe('Um resumo da situação financeira atual.'),
  recommendations: z.array(z.string()).describe('Lista de recomendações práticas.'),
  riskLevel: z.enum(['baixo', 'médio', 'alto']).describe('Nível de risco financeiro baseado nos dados.'),
});

export type FinancialAdvisorOutput = z.infer<typeof FinancialAdvisorOutputSchema>;

export async function analyzeFinances(input: FinancialAdvisorInput): Promise<FinancialAdvisorOutput> {
  return financialAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAdvisorPrompt',
  input: { schema: FinancialAdvisorInputSchema },
  output: { schema: FinancialAdvisorOutputSchema },
  prompt: `Você é um consultor financeiro pessoal experiente e amigável.
  Analise os seguintes dados financeiros do usuário e forneça um resumo estratégico, recomendações práticas e determine o nível de risco.
  
  Mês Atual: {{currentMonth.month}}
  Renda Total: R$ {{currentMonth.totalIncome}}
  Despesas Totais: R$ {{currentMonth.totalExpenses}}
  
  Distribuição de Despesas:
  {{#each currentMonth.expensesByCategory}}
  - {{category}}: R$ {{amount}}
  {{/each}}
  
  Histórico de Saldos (meses anteriores):
  {{#each history}}
  - {{month}}: R$ {{balance}}
  {{/each}}
  
  Sua análise deve ser empática, focada em saúde financeira de longo prazo e oferecer passos acionáveis.`,
});

const financialAdvisorFlow = ai.defineFlow(
  {
    name: 'financialAdvisorFlow',
    inputSchema: FinancialAdvisorInputSchema,
    outputSchema: FinancialAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
