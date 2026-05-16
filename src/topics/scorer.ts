import { WikipediaTopic } from './wikipedia';
import { RedditTopic } from './reddit';

export interface ScoredTopic {
  topic: WikipediaTopic | RedditTopic;
  score: number;
  scoreBreakdown: {
    engagement: number;
    novelty: number;
    contentPotential: number;
  };
}

const RECENT_TOPICS_WINDOW = 100;

export function scoreTopics(
  topics: (WikipediaTopic | RedditTopic)[],
  recentTopics: string[] = []
): ScoredTopic[] {
  return topics.map((topic) => {
    const engagement = calculateEngagement(topic);
    const novelty = calculateNovelty(topic, recentTopics);
    const contentPotential = calculateContentPotential(topic);

    const score = Math.round(
      engagement * 0.3 + novelty * 0.4 + contentPotential * 0.3
    );

    return {
      topic,
      score: Math.min(100, Math.max(0, score)),
      scoreBreakdown: { engagement, novelty, contentPotential },
    };
  }).sort((a, b) => b.score - a.score);
}

function calculateEngagement(topic: WikipediaTopic | RedditTopic): number {
  if (topic.source === 'reddit') {
    const score = Math.min(topic.score, 10000) / 100;
    const comments = Math.min(topic.numComments, 1000) / 10;
    return Math.min(100, Math.round(score * 0.6 + comments * 0.4));
  }

  // Wikipedia: base score from having content
  return topic.summary.length > 100 ? 50 : 30;
}

function calculateNovelty(topic: WikipediaTopic | RedditTopic, recentTopics: string[]): number {
  const title = topic.title.toLowerCase();

  for (const recent of recentTopics) {
    if (title.includes(recent.toLowerCase()) || recent.toLowerCase().includes(title)) {
      return 20;
    }
  }

  // Reddit posts about obscure topics score higher for novelty
  if (topic.source === 'reddit' && topic.score < 100) {
    return 80;
  }

  if (topic.source === 'reddit' && topic.score < 500) {
    return 60;
  }

  return 50;
}

function calculateContentPotential(topic: WikipediaTopic | RedditTopic): number {
  if (topic.source === 'reddit') {
    const hasDetail = topic.summary.length > 100;
    const hasEngagement = topic.numComments > 20;
    return Math.min(100, (hasDetail ? 40 : 20) + (hasEngagement ? 40 : 20) + 20);
  }

  // Wikipedia: longer summaries suggest more content available
  const lengthScore = Math.min(100, topic.summary.length / 3);
  return Math.round(lengthScore);
}
