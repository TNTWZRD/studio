'use server';

import {
  enhanceLiveStreamerStripWithAIAssessment,
  EnhanceLiveStreamerStripWithAIAssessmentInput,
  EnhanceLiveStreamerStripWithAIAssessmentOutput,
} from '@/ai/flows/assess-live-stream-info';

export async function assessStreamer(
  streamer: EnhanceLiveStreamerStripWithAIAssessmentInput
): Promise<EnhanceLiveStreamerStripWithAIAssessmentOutput> {
  try {
    const assessedInfo = await enhanceLiveStreamerStripWithAIAssessment(streamer);
    return assessedInfo;
  } catch (error) {
    console.error('Error assessing streamer info:', error);
    // On error, return the original data with a default for 'game' if missing.
    return {
      ...streamer,
      game: streamer.game || 'Unknown Game',
    };
  }
}
