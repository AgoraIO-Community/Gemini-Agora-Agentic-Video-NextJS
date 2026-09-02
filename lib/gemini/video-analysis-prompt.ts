export const VIDEO_ANALYSIS_PROMPT = `You are analyzing a video that will later be discussed with a conversational AI voice agent.

Understand the video as thoroughly as necessary for useful follow-up conversation.

Identify:
1. a concise overall summary
2. the most meaningful moments
3. timestamps for those moments
4. what happens at each timestamp
5. important changes, anomalies, mistakes, decisions, actions, or transitions when relevant
6. useful factual context that would help answer follow-up questions about the video

Pay special attention to countable visual information. If the video contains hand gestures, raised fingers, visible numbers, cards, objects being moved, repeated actions, or a sequence of signs, count them and describe the order. For raised fingers or hand signs, state how many fingers are visible on each hand when reasonably clear. Add timestamped moments for each meaningful change in the count or gesture.

Do not invent events that are not visible or audible. If something is uncertain, say that it is uncertain in the context field.

Return only valid JSON. Do not wrap the JSON in markdown fences.

Use this exact shape:
{
  "summary": "string",
  "moments": [
    {
      "timestampSeconds": 14,
      "timestampLabel": "00:14",
      "title": "Short title",
      "description": "What happens here and why it may matter"
    }
  ],
  "context": "Detailed factual context useful for follow-up conversation"
}`;
