'use server';

/**
 * @fileOverview AI-powered income forecasting flow.
 *
 * - forecastIncome - A function that forecasts future income based on past data.
 * - ForecastIncomeInput - The input type for the forecastIncome function.
 * - ForecastIncomeOutput - The return type for the forecastIncome function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ForecastIncomeInputSchema = z.object({
  pastIncomeData: z
    .array(z.object({
      month: z.string().describe('The month in YYYY-MM format.'),
      income: z.number().describe('The total income for the month.'),
    }))
    .describe('An array of past income data, with month and income.'),
  currentMonth: z.string().describe('The current month in YYYY-MM format.'),
});
export type ForecastIncomeInput = z.infer<typeof ForecastIncomeInputSchema>;

const ForecastIncomeOutputSchema = z.object({
  forecastedIncome: z
    .number()
    .describe('The forecasted income for the current month.'),
  explanation: z
    .string()
    .describe('An explanation of how the forecasted income was calculated.'),
});
export type ForecastIncomeOutput = z.infer<typeof ForecastIncomeOutputSchema>;

export async function forecastIncome(input: ForecastIncomeInput): Promise<ForecastIncomeOutput> {
  return forecastIncomeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forecastIncomePrompt',
  input: {schema: ForecastIncomeInputSchema},
  output: {schema: ForecastIncomeOutputSchema},
  prompt: `You are a personal finance advisor. You will analyze past income data to forecast income for the current month.

Past Income Data:
{{#each pastIncomeData}}
- {{month}}: {{income}}
{{/each}}

Current Month: {{currentMonth}}

Based on this data, forecast the income for the current month and explain your reasoning.`,
});

const forecastIncomeFlow = ai.defineFlow(
  {
    name: 'forecastIncomeFlow',
    inputSchema: ForecastIncomeInputSchema,
    outputSchema: ForecastIncomeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
