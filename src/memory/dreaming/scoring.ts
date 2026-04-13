/**
 * Memory importance scoring for the Dreaming consolidation system.
 */

export interface ScoringWeights {
  recency: number;       // 0.15
  frequency: number;     // 0.24
  importance: number;    // 0.30
  diversity: number;     // 0.15
  consolidation: number; // 0.10
  richness: number;      // 0.06
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.15,
  frequency: 0.24,
  importance: 0.30,
  diversity: 0.15,
  consolidation: 0.10,
  richness: 0.06,
};

export interface ScoringInput {
  content: string;
  timestamp: string;        // ISO-8601
  accessCount: number;
  importance: number;       // 0-1 (user/agent-assigned)
  tags: string[];
  alreadyInLongTerm: boolean;
}

export function scoreMemoryChunk(input: ScoringInput, weights = DEFAULT_WEIGHTS): number {
  const recencyScore = computeRecency(input.timestamp);
  const frequencyScore = Math.min(input.accessCount / 10, 1);
  const importanceScore = input.importance;
  const diversityScore = Math.min(input.tags.length / 5, 1);
  const consolidationScore = input.alreadyInLongTerm ? 1 : 0;
  const richnessScore = computeRichness(input.content);

  return (
    weights.recency * recencyScore +
    weights.frequency * frequencyScore +
    weights.importance * importanceScore +
    weights.diversity * diversityScore +
    weights.consolidation * consolidationScore +
    weights.richness * richnessScore
  );
}

function computeRecency(timestamp: string): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // Exponential decay: score of 1 for today, ~0.5 for 7 days, ~0.1 for 30 days
  return Math.exp(-0.1 * ageDays);
}

function computeRichness(content: string): number {
  // Proxy for conceptual richness: unique word count normalised to 0-1
  const words = new Set(content.toLowerCase().match(/\b\w{4,}\b/g) ?? []);
  return Math.min(words.size / 50, 1);
}
