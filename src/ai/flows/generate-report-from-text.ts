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
  titulo: z.string().default('Comprobante de pago'),
  numeroSecuencia: z.string(),
  emisor: z.object({
    nombre: z.string().default('OLGER RODRIGO FLORES FLORES'),
    ruc: z.string().default('1703684785001'),
    direccion: z.string().default('Real Audicencia'),
    telefono: z.string().default('0983502111'),
  }),
  receptor: z.object({
    nombre: z.string().default('AMADA HORTENCIA CISNEROS BURBANO'),
    telefono: z.string().default('099 480 6251'),
    direccion: z.string().default('Calle Real Audiencia N-63-141 y Los Cedros'),
    identificacion: z.string().default('1707158364'),
    fechaCobro: z.string().describe('La fecha actual en formato YYYY-MM-DD'),
  }),
  items: z.array(
    z.object({
      unidad: z.string().default('Otro ingreso'),
      detalle: z.string().describe("Incluir 'Arriendo de casa, mes de' y el mes actual y año 2025"),
      valor: z.number().default(350.0),
      descuento: z.number().default(0.0),
      pago: z.number().default(350.0),
    })
  ),
  pie: z.object({
    formaPago: z.string().default('Forma de pago en dólares, transferencia.'),
    documentoComprobante: z.string().describe('El número de comprobante extraído del texto OCR.'),
    informacionRelacionada: z
      .string()
      .default('Banco Internacional Cta. Ahorros: 608032998.'),
  }),
  totales: z.object({
    subtotal: z.number().default(350.0),
    descuentos: z.number().default(0.0),
    total: z.number().default(350.0),
  }),
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
  prompt: `
    You are an AI assistant that generates a payment receipt based on extracted text.
    The output must be a JSON object matching the provided schema.
    The user wants a receipt with a specific structure. Please populate the JSON fields exactly as requested in the schema descriptions.
    - Generate a unique sequence number.
    - For the item detail, use the current month and the year 2025.
    - Use the provided OCR text to fill in the 'documentoComprobante' field.
    - Set the 'fechaCobro' to today's date.
    
    Extracted OCR Text: {{{extractedText}}}
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