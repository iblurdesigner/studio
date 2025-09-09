'use server';

/**
 * @fileOverview Generates a formatted report from extracted text using generative AI.
 *
 * - generateReportFromText - A function that generates a formatted report from text.
 * - GenerateReportFromTextInput - The input type for the generateReportFromText function.
 * - GenerateReportFromTextOutput - The return type for the generateReportFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportFromTextInputSchema = z.object({
  extractedText: z
    .string()
    .describe('The extracted text from the OCR process.'),
});
export type GenerateReportFromTextInput = z.infer<
  typeof GenerateReportFromTextInputSchema
>;

const GenerateReportFromTextOutputSchema = z.object({
  report: z.string().describe('The formatted report generated from the text.'),
});
export type GenerateReportFromTextOutput = z.infer<
  typeof GenerateReportFromTextOutputSchema
>;

export async function generateReportFromText(
  input: GenerateReportFromTextInput
): Promise<GenerateReportFromTextOutput> {
  return generateReportFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportFromTextPrompt',
  input: {schema: GenerateReportFromTextInputSchema},
  output: {schema: GenerateReportFromTextOutputSchema},
  prompt: `You are an AI that generates a formatted report from the extracted text.

  Extracted Text: {{{extractedText}}}

  Please generate a well-formatted and informative report based on the extracted text.
  The report should be easy to read and understand.
  `,
});

const generateReportFromTextFlow = ai.defineFlow(
  {
    name: 'generateReportFromTextFlow',
    inputSchema: GenerateReportFromTextInputSchema,
    outputSchema: GenerateReportFromTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
