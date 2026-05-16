import { SegmentType } from '../scripts/types';

export interface PromptContext {
  topic: string;
  segmentType: SegmentType;
  targetWordCount: number;
  previousSegments?: string[];
  visualCues?: string[];
}

const SYSTEM_PROMPT = `You are a professional YouTube scriptwriter specializing in history and facts content. Your scripts are engaging, well-researched, and designed for 8-10 minute educational videos.

WRITING GUIDELINES:
- Write in a conversational, engaging tone
- Use hooks and curiosity gaps to maintain viewer interest
- Include specific dates, names, and details for credibility
- Avoid filler phrases like "In this video we'll explore"
- Write for spoken delivery - use shorter sentences and natural rhythm
- Each segment should flow naturally into the next
- Include visual cue suggestions in brackets like [Show: map of ancient Rome]

FORMAT:
Respond ONLY with valid JSON matching this structure:
{
  "text": "The script text for this segment...",
  "estimatedDuration": 30,
  "visualCue": "Description of suggested visual",
  "keywords": ["keyword1", "keyword2"]
}`;

const PROMPTS: Record<SegmentType, (ctx: PromptContext) => string> = {
  hook: (ctx) => `Write a gripping 15-20 second hook about "${ctx.topic}" that immediately grabs attention.

Start with a surprising fact, provocative question, or dramatic statement.
Do NOT introduce yourself or the channel.
Do NOT say "today we're going to talk about."
Make the viewer NEED to keep watching.

Target word count: ${ctx.targetWordCount}`,

  intro: (ctx) => `Write a brief introduction for a history video about "${ctx.topic}".

Set the context and time period.
Establish why this topic matters.
Create anticipation for what's coming.
Keep it under 30 seconds.

Target word count: ${ctx.targetWordCount}`,

  body: (ctx) => `Write the main content for a history video about "${ctx.topic}".

Provide detailed historical information with specific facts, dates, and names.
Tell a compelling story - don't just list facts.
Use narrative techniques: foreshadowing, tension, resolution.
Include at least 3 specific historical details.

${ctx.previousSegments && ctx.previousSegments.length > 0 ? `Previous context: ${ctx.previousSegments.join(' ')}` : ''}

Target word count: ${ctx.targetWordCount}`,

  transition: (ctx) => `Write a brief transition segment for a history video about "${ctx.topic}".

Bridge the previous content to the next section.
Maintain narrative momentum.
Hint at what's coming next to keep viewers engaged.
Keep it under 15 seconds.

Target word count: ${ctx.targetWordCount}`,

  conclusion: (ctx) => `Write a conclusion for a history video about "${ctx.topic}".

Summarize the key takeaway.
End with a thought-provoking statement or lasting image.
Connect the historical topic to something relevant today if possible.
Do NOT say "thanks for watching" - that comes in the CTA.

Target word count: ${ctx.targetWordCount}`,

  cta: (ctx) => `Write a brief call-to-action for a history video about "${ctx.topic}".

Ask viewers to like and subscribe.
Suggest a related video topic.
Keep it natural and under 15 seconds.
Do NOT be overly enthusiastic or use phrases like "smash that like button."

Target word count: ${ctx.targetWordCount}`,
};

export function buildPrompt(context: PromptContext): { system: string; user: string } {
  const promptFn = PROMPTS[context.segmentType];
  if (!promptFn) {
    throw new Error(`Unknown segment type: ${context.segmentType}`);
  }

  return {
    system: SYSTEM_PROMPT,
    user: promptFn(context),
  };
}

export function buildFullScriptPrompt(topic: string, targetDurationMinutes = 9): string {
  return {
    system: SYSTEM_PROMPT,
    user: `Write a complete YouTube script about "${topic}" for a ${targetDurationMinutes}-minute history video.

The script should have these segments in order:
1. Hook (15-20 seconds) - Grab attention immediately
2. Intro (30 seconds) - Set context and time period
3. Body (multiple segments, ~6-7 minutes total) - Main historical content
4. Transition (10-15 seconds) - Between major sections
5. Conclusion (30-45 seconds) - Key takeaway and lasting thought
6. CTA (10-15 seconds) - Call to action

Respond with a JSON object containing:
{
  "title": "Video title",
  "topic": "${topic}",
  "segments": [
    {
      "type": "hook|intro|body|transition|conclusion|cta",
      "text": "Script text...",
      "estimatedDuration": 30,
      "visualCue": "Visual suggestion...",
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "estimatedTotalDuration": 540,
  "targetWordCount": 1350
}

Total estimated duration should be approximately ${targetDurationMinutes * 60} seconds.
Total word count should be approximately ${targetDurationMinutes * 150} words.`,
  };
}
