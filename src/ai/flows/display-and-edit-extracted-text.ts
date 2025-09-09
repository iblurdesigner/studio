'use server';
/**
 * @fileOverview This file defines a Genkit flow for displaying and editing extracted text from an image.
 *
 * The flow takes extracted text as input and returns the same text, allowing the user to edit it in between.
 * - displayAndEditExtractedText - A function that handles the text display and edit process.
 * - DisplayAndEditExtractedTextInput - The input type for the displayAndEditExtractedText function.
 * - DisplayAndEditExtractedTextOutput - The return type for the displayAndEditExtractedText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DisplayAndEditExtractedTextSchema = z.object({
  extractedText: z.string().describe('The text extracted from the image.'),
});
export type DisplayAndEditExtractedTextInput = z.infer<typeof DisplayAndEditExtractedTextSchema>;

const DisplayAndEditExtractedTextOutputSchema = z.object({
  editedText: z.string().describe('The edited text after user corrections.'),
});
export type DisplayAndEditExtractedTextOutput = z.infer<typeof DisplayAndEditExtractedTextOutputSchema>;

export async function displayAndEditExtractedText(
  input: DisplayAndEditExtractedTextInput
): Promise<DisplayAndEditExtractedTextOutput> {
  return displayAndEditExtractedTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'displayAndEditExtractedTextPrompt',
  input: {schema: DisplayAndEditExtractedTextSchema},
  output: {schema: DisplayAndEditExtractedTextOutputSchema},
  prompt: `You are a helpful assistant designed to display extracted text and allow for user edits.

  Extracted Text: {{{extractedText}}}

  Please display the extracted text to the user for editing and return the edited text.
  The edited text should be a corrected version of the extracted text.
  Do not modify the text, just return it.
  `,
});

const displayAndEditExtractedTextFlow = ai.defineFlow(
  {
    name: 'displayAndEditExtractedTextFlow',
    inputSchema: DisplayAndEditExtractedTextSchema,
    outputSchema: DisplayAndEditExtractedTextOutputSchema,
  },
  async input => {
    // This flow simply returns the input, allowing the user interface to handle
    // the editing. The edited text will then be passed to the next flow.
    const {output} = await prompt(input);
    return output!;
  }
);
