import { describe, it, expect } from 'vitest';
import { scoreTopics, ScoredTopic } from '../../src/topics/scorer';
import { WikipediaTopic } from '../../src/topics/wikipedia';
import { RedditTopic } from '../../src/topics/reddit';

function makeWikiTopic(title: string, summary: string): WikipediaTopic {
  return { title, summary, url: `https://en.wikipedia.org/wiki/${title}`, source: 'wikipedia' };
}

function makeRedditTopic(title: string, score: number, comments: number, summary: string): RedditTopic {
  return {
    title, summary, url: `https://reddit.com/r/History/${title}`,
    score, subreddit: 'History', numComments: comments, source: 'reddit',
  };
}

describe('Topic Scorer', () => {
  describe('scoreTopics', () => {
    it('scores and sorts topics by total score', () => {
      const topics = [
        makeRedditTopic('Low engagement', 10, 5, 'Short summary'),
        makeRedditTopic('High engagement', 5000, 500, 'A very detailed summary about this fascinating historical event that has lots of content potential for a video'),
        makeRedditTopic('Medium engagement', 200, 50, 'A decent summary with some details about the topic'),
      ];

      const results = scoreTopics(topics);

      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
    });

    it('returns scores between 0 and 100', () => {
      const topics = [
        makeRedditTopic('Test', 99999, 9999, 'Long detailed summary'),
        makeRedditTopic('Test 2', 0, 0, ''),
      ];

      const results = scoreTopics(topics);
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });

    it('includes score breakdown', () => {
      const topics = [makeRedditTopic('Test', 100, 30, 'Some summary content here')];
      const results = scoreTopics(topics);

      expect(results[0].scoreBreakdown).toHaveProperty('engagement');
      expect(results[0].scoreBreakdown).toHaveProperty('novelty');
      expect(results[0].scoreBreakdown).toHaveProperty('contentPotential');
    });

    it('penalizes topics similar to recent topics', () => {
      const topics = [
        makeRedditTopic('Roman Empire', 200, 50, 'Detailed summary of Roman Empire history'),
        makeRedditTopic('Greek Philosophy', 200, 50, 'Detailed summary of Greek philosophy'),
      ];

      const withRecent = scoreTopics(topics, ['Roman Empire']);
      const withoutRecent = scoreTopics(topics);

      const romanWithRecent = withRecent.find((t) => t.topic.title === 'Roman Empire');
      const romanWithoutRecent = withoutRecent.find((t) => t.topic.title === 'Roman Empire');

      expect(romanWithRecent!.scoreBreakdown.novelty).toBeLessThan(romanWithoutRecent!.scoreBreakdown.novelty);
    });

    it('scores Wikipedia topics', () => {
      const topics = [
        makeWikiTopic('Long topic', 'A'.repeat(300)),
        makeWikiTopic('Short topic', 'Brief'),
      ];

      const results = scoreTopics(topics);

      expect(results[0].scoreBreakdown.contentPotential).toBeGreaterThan(results[1].scoreBreakdown.contentPotential);
    });

    it('scores Reddit topics with high engagement higher', () => {
      const topics = [
        makeRedditTopic('Viral post', 5000, 800, 'Very detailed post with lots of information'),
        makeRedditTopic('Quiet post', 5, 2, 'Short'),
      ];

      const results = scoreTopics(topics);

      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[0].scoreBreakdown.engagement).toBeGreaterThan(results[1].scoreBreakdown.engagement);
    });

    it('favors obscure Reddit topics for novelty', () => {
      const obscure = makeRedditTopic('Obscure event', 50, 10, 'Details about an unknown event');
      const popular = makeRedditTopic('Popular event', 5000, 800, 'Details about a well-known event');

      const results = scoreTopics([obscure, popular]);

      const obscureResult = results.find((t) => t.topic.title === 'Obscure event');
      const popularResult = results.find((t) => t.topic.title === 'Popular event');

      expect(obscureResult!.scoreBreakdown.novelty).toBeGreaterThan(popularResult!.scoreBreakdown.novelty);
    });

    it('handles empty topic list', () => {
      const results = scoreTopics([]);
      expect(results).toEqual([]);
    });
  });
});
