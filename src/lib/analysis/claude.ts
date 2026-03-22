import Anthropic from '@anthropic-ai/sdk';
import { ActivityItem, AnalysisResult, DateRange } from '../types';

const SYSTEM_PROMPT = `You are a productivity analyst. Given a list of work activities from various sources (GitHub, Slack, Jira, Gmail, Google Calendar, Linear, Claude Code, Codex, GitHub Copilot), analyze the data and produce a structured report.

Your analysis should:
1. Identify 3-7 major themes/topics the person has been working on
2. Categorize all activities into work categories (e.g., "Code Review", "Feature Development", "Communication", "Project Management", "Meetings", "AI-Assisted Development")
3. Write a 2-3 paragraph narrative summary of the period
4. Write an executive summary suitable for sharing with managers and HR for performance reviews, promotion cases, and compensation discussions
5. List 3-5 key insights or observations about productivity patterns
6. Calculate key metrics from the data

Return your response as valid JSON matching this exact schema:
{
  "themes": [{ "name": string, "description": string, "activityCount": number, "activityIds": string[] }],
  "categories": [{ "category": string, "count": number, "percentage": number, "sources": string[] }],
  "narrative": string,
  "executiveSummary": {
    "headline": string,
    "accomplishments": string[],
    "impact": string[],
    "leadership": string[],
    "body": string
  },
  "insights": string[],
  "metrics": {
    "totalActivities": number,
    "prsMerged": number,
    "issuesClosed": number,
    "meetingsAttended": number,
    "meetingHours": number,
    "messagesSent": number,
    "emailsSent": number,
    "commitsAuthored": number,
    "aiConversations": number
  }
}

For the executiveSummary:
- "headline": A single compelling sentence summarizing the period's value (e.g., "Delivered critical platform infrastructure improvements while launching a new product initiative")
- "accomplishments": 3-5 concrete, outcome-oriented bullet points. Use action verbs (Delivered, Launched, Resolved, Architected). Include specific metrics, project names, and Jira keys. Focus on what was completed, not what was worked on.
- "impact": 2-4 bullet points describing business or team impact. How did this work reduce risk, unblock others, improve velocity, reduce tech debt, or advance strategic goals? Quantify where possible.
- "leadership": 2-3 bullet points highlighting cross-team collaboration, mentoring, knowledge sharing, process improvement, or tooling adoption that goes beyond individual contribution.
- "body": A 2-3 paragraph professional summary written in third person, suitable for inclusion in a performance review document. Emphasize outcomes, strategic alignment, and scope of influence. Do not include raw metrics or activity counts — focus on the narrative of impact and value delivered.

Be specific and insightful in your analysis. Reference actual project names, PR titles, and issue keys when discussing themes. For meetingHours, sum the durationMinutes from calendar activities and convert to hours.`;

export async function analyzeActivities(
  activities: ActivityItem[],
  dateRange: DateRange
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const client = new Anthropic({ apiKey });

  // If there are too many activities, summarize them
  const activityData = activities.length > 500
    ? summarizeActivities(activities)
    : activities;

  const userMessage = `Analyze the following work activities from ${dateRange.start} to ${dateRange.end}.

Total activities: ${activities.length}

Activities data:
${JSON.stringify(activityData, null, 2)}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
    system: SYSTEM_PROMPT,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();

  try {
    return JSON.parse(jsonStr) as AnalysisResult;
  } catch {
    // Retry once with a simpler prompt if JSON parsing fails
    const retryResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: text },
        { role: 'user', content: 'Your response was not valid JSON. Please respond with ONLY the JSON object, no markdown formatting or extra text.' },
      ],
      system: SYSTEM_PROMPT,
    });

    const retryText = retryResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const retryJsonMatch = retryText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, retryText];
    const retryJsonStr = retryJsonMatch[1]?.trim() || retryText.trim();
    return JSON.parse(retryJsonStr) as AnalysisResult;
  }
}

function summarizeActivities(activities: ActivityItem[]): Record<string, unknown>[] {
  // Group by day and source, keep representative titles
  const grouped = new Map<string, { count: number; types: Set<string>; titles: string[] }>();

  for (const activity of activities) {
    const day = activity.timestamp.split('T')[0];
    const key = `${day}|${activity.source}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.count++;
      existing.types.add(activity.type);
      if (existing.titles.length < 5) existing.titles.push(activity.title);
    } else {
      grouped.set(key, {
        count: 1,
        types: new Set([activity.type]),
        titles: [activity.title],
      });
    }
  }

  return Array.from(grouped.entries()).map(([key, data]) => {
    const [day, source] = key.split('|');
    return {
      day,
      source,
      count: data.count,
      types: Array.from(data.types),
      sampleTitles: data.titles,
    };
  });
}
