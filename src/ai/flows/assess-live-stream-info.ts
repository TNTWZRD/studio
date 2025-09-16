'use server';

/**
 * @fileOverview A Genkit flow to enhance live streamer information with AI assessment.
 *
 * This file defines a Genkit flow that takes in streamer data and uses GenAI to assess and correct the
 * information displayed in the "Now Live" streamer strip, ensuring accuracy of game, platform, title, and link.
 *
 * @interface EnhanceLiveStreamerStripWithAIAssessmentInput - The input type for the enhanceLiveStreamerStripWithAIAssessment function.
 * @interface EnhanceLiveStreamerStripWithAIAssessmentOutput - The output type for the enhanceLiveStreamerStripWithAIAssessment function.
 * @function enhanceLiveStreamerStripWithAIAssessment - The main function that orchestrates the AI assessment and returns enhanced streamer data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schemas for input and output types
const EnhanceLiveStreamerStripWithAIAssessmentInputSchema = z.object({
  name: z.string().describe('The streamer name.'),
  platform: z.string().describe('The streaming platform (e.g., Twitch, YouTube).'),
  platformUrl: z.string().url().describe('The URL of the streamer\'s platform.'),
  avatar: z.string().describe('URL to the streamer\'s avatar image.'),
  isLive: z.boolean().describe('Whether the streamer is currently live.'),
  title: z.string().describe('The current stream title.'),
  game: z.string().optional().describe('The game being streamed, if available.'),
});

export type EnhanceLiveStreamerStripWithAIAssessmentInput = z.infer<
  typeof EnhanceLiveStreamerStripWithAIAssessmentInputSchema
>;

const EnhanceLiveStreamerStripWithAIAssessmentOutputSchema = z.object({
  name: z.string().describe('The streamer name.'),
  platform: z.string().describe('The streaming platform (e.g., Twitch, YouTube).'),
  platformUrl: z.string().url().describe('The URL of the streamer\'s platform.'),
  avatar: z.string().describe('URL to the streamer\'s avatar image.'),
  isLive: z.boolean().describe('Whether the streamer is currently live.'),
  title: z.string().describe('The assessed stream title.'),
  game: z.string().describe('The assessed game being streamed.'),
});

export type EnhanceLiveStreamerStripWithAIAssessmentOutput = z.infer<
  typeof EnhanceLiveStreamerStripWithAIAssessmentOutputSchema
>;

// Define the main function that calls the flow
export async function enhanceLiveStreamerStripWithAIAssessment(
  input: EnhanceLiveStreamerStripWithAIAssessmentInput
): Promise<EnhanceLiveStreamerStripWithAIAssessmentOutput> {
  return enhanceLiveStreamerInfoFlow(input);
}

// Define the Genkit prompt
const enhanceLiveStreamerInfoPrompt = ai.definePrompt({
  name: 'enhanceLiveStreamerInfoPrompt',
  input: {schema: EnhanceLiveStreamerStripWithAIAssessmentInputSchema},
  output: {schema: EnhanceLiveStreamerStripWithAIAssessmentOutputSchema},
  prompt: `You are an AI assistant that enhances live streamer information for accuracy.

  Given the following streamer data, assess and correct the stream title and game being streamed.
  Ensure the information is accurate and reflects the current stream content.

  Streamer Name: {{{name}}}
  Platform: {{{platform}}}
  Platform URL: {{{platformUrl}}}
  Current Stream Title: {{{title}}}
  Current Game (if available): {{{game}}}

  Provide the enhanced stream title and game. If the current game is not available, make an educated guess as to what they are playing. Be concise.
  Ensure you respond in a way that can be parsed as a valid JSON object.
  {
    "title": "<Enhanced Stream Title>",
    "game": "<Enhanced Game>"
  }`,
});

// Define the Genkit flow
const enhanceLiveStreamerInfoFlow = ai.defineFlow(
  {
    name: 'enhanceLiveStreamerInfoFlow',
    inputSchema: EnhanceLiveStreamerStripWithAIAssessmentInputSchema,
    outputSchema: EnhanceLiveStreamerStripWithAIAssessmentOutputSchema,
  },
  async input => {
    const {output} = await enhanceLiveStreamerInfoPrompt(input);
    return output!;
  }
);
