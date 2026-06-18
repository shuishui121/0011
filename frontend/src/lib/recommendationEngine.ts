import type { ElementType } from "@/types";
import {
  partMeta,
  partMetaList,
  builtinAssociations,
  getCategoryLabel,
  type PartCategory,
  type Association,
} from "./partCategories";
import { operationHistory } from "./operationHistory";

export interface Recommendation {
  type: ElementType;
  label: string;
  score: number;
  reason: string;
  category: PartCategory;
  categoryLabel: string;
  fromUser: boolean;
}

export interface SuggestionContext {
  userId: number;
  currentType: ElementType | null;
  canvasTypes: ElementType[];
}

const DEFAULT_COLD_START: ElementType[] = ["gear", "bearing", "lever", "spring", "pulley"];

interface Candidate {
  type: ElementType;
  domainScore: number;
  userScore: number;
  coOccurBonus: number;
  reason: string;
  fromUser: boolean;
}

function normalizeUserUsage(
  userId: number,
  type: ElementType
): { scores: Partial<Record<ElementType, number>>; max: number } {
  const afterUsage = operationHistory.getAfterUsage(userId, type);
  const values = Object.values(afterUsage) as number[];
  const max = values.length > 0 ? Math.max(...values) : 0;
  const scores: Partial<Record<ElementType, number>> = {};
  if (max > 0) {
    for (const [k, v] of Object.entries(afterUsage)) {
      scores[k as ElementType] = (v as number) / max;
    }
  }
  return { scores, max };
}

export function getSuggestions(ctx: SuggestionContext, limit = 6): Recommendation[] {
  const { userId, currentType, canvasTypes } = ctx;
  const candidates = new Map<ElementType, Candidate>();

  if (currentType) {
    const associations: Association[] = builtinAssociations[currentType] ?? [];
    for (const assoc of associations) {
      candidates.set(assoc.type, {
        type: assoc.type,
        domainScore: assoc.weight,
        userScore: 0,
        coOccurBonus: 0,
        reason: assoc.reason,
        fromUser: false,
      });
    }

    const { scores, max } = normalizeUserUsage(userId, currentType);
    if (max > 0) {
      for (const [typeStr, normalized] of Object.entries(scores)) {
        const type = typeStr as ElementType;
        const existing = candidates.get(type);
        if (existing) {
          existing.userScore = normalized as number;
          if (normalized as number > existing.domainScore) {
            existing.reason = "您常用搭配";
            existing.fromUser = true;
          }
        } else {
          candidates.set(type, {
            type,
            domainScore: 0,
            userScore: normalized as number,
            coOccurBonus: 0,
            reason: "您常用搭配",
            fromUser: true,
          });
        }
      }
    }
  }

  const otherTypes = canvasTypes.filter((t) => t !== currentType);
  for (const [type, candidate] of candidates) {
    let bonus = 0;
    for (const other of otherTypes) {
      const assoc = builtinAssociations[other] ?? [];
      const found = assoc.find((a) => a.type === type);
      if (found) bonus += found.weight * 0.15;
    }
    candidate.coOccurBonus = Math.min(0.2, bonus);
  }

  if (candidates.size === 0) {
    if (otherTypes.length > 0) {
      const aggregated = new Map<ElementType, { sum: number; reason: string }>();
      for (const other of otherTypes) {
        const assoc = builtinAssociations[other] ?? [];
        for (const a of assoc) {
          const prev = aggregated.get(a.type);
          if (prev) prev.sum += a.weight;
          else aggregated.set(a.type, { sum: a.weight, reason: a.reason });
        }
      }
      for (const [type, info] of aggregated) {
        candidates.set(type, {
          type,
          domainScore: info.sum / otherTypes.length,
          userScore: 0,
          coOccurBonus: 0,
          reason: info.reason,
          fromUser: false,
        });
      }
    } else {
      for (const type of DEFAULT_COLD_START) {
        const assoc = builtinAssociations[type]?.[0];
        candidates.set(type, {
          type,
          domainScore: 0.55,
          userScore: 0,
          coOccurBonus: 0,
          reason: assoc?.reason ?? "常用起步零件",
          fromUser: false,
        });
      }
    }
  }

  const strength = operationHistory.getUserStrength(userId);
  const userWeight = Math.min(0.45, (strength / 300) * 0.45);
  const domainWeight = 1 - userWeight;

  const results: Recommendation[] = [];
  for (const candidate of candidates.values()) {
    const score =
      candidate.domainScore * domainWeight +
      candidate.userScore * userWeight +
      candidate.coOccurBonus;
    const meta = partMeta[candidate.type];
    results.push({
      type: candidate.type,
      label: meta.label,
      score,
      reason: candidate.reason,
      category: meta.category,
      categoryLabel: getCategoryLabel(meta.category),
      fromUser: candidate.fromUser,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export interface SearchResult {
  type: ElementType;
  label: string;
  category: PartCategory;
  categoryLabel: string;
  score: number;
  matchedAlias: string;
  usedByUser: boolean;
}

export function searchParts(query: string, userId: number): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  for (const meta of partMetaList) {
    let bestAlias = "";
    let bestScore = 0;

    if (meta.label.toLowerCase().includes(q)) {
      bestAlias = meta.label;
      bestScore = 1.0;
    }

    for (const alias of meta.aliases) {
      const lowerAlias = alias.toLowerCase();
      if (lowerAlias === q) {
        bestAlias = alias;
        bestScore = Math.max(bestScore, 0.95);
      } else if (lowerAlias.includes(q)) {
        if (bestScore < 0.85) {
          bestAlias = alias;
          bestScore = 0.85;
        }
      } else if (q.includes(lowerAlias) && lowerAlias.length >= 2) {
        if (bestScore < 0.7) {
          bestAlias = alias;
          bestScore = 0.7;
        }
      }
    }

    if (bestScore > 0) {
      const afterUsage = operationHistory.getAfterUsage(userId, meta.type);
      const usedCount = Object.values(afterUsage).reduce((s, n) => s + (n as number), 0);
      results.push({
        type: meta.type,
        label: meta.label,
        category: meta.category,
        categoryLabel: getCategoryLabel(meta.category),
        score: bestScore + (usedCount > 0 ? 0.05 : 0),
        matchedAlias: bestAlias,
        usedByUser: usedCount > 0,
      });
    }
  }

  results.sort((a, b) => {
    if (a.category !== b.category) {
      const order: PartCategory[] = [
        "transmission",
        "support",
        "energy",
        "hydraulic",
        "structure",
        "annotation",
      ];
      return order.indexOf(a.category) - order.indexOf(b.category);
    }
    return b.score - a.score;
  });

  return results;
}

export function recordAdd(userId: number, type: ElementType): void {
  operationHistory.recordAdd(userId, type);
}

export function recordCombination(userId: number, types: ElementType[]): void {
  operationHistory.recordCombination(userId, types);
}

export function measureSuggestionTime<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

export interface SmartEdge {
  from: string;
  to: string;
}

export function computeSmartConnectionEdges(
  elements: { id: string; x: number; y: number; width: number; height: number }[]
): SmartEdge[] {
  if (elements.length < 2) return [];
  const centers = elements.map((e) => ({
    id: e.id,
    x: e.x + e.width / 2,
    y: e.y + e.height / 2,
  }));

  const connected = new Set<string>([centers[0].id]);
  const edges: SmartEdge[] = [];
  while (connected.size < centers.length) {
    let best: { from: string; to: string; dist: number } | null = null;
    for (const a of centers) {
      if (!connected.has(a.id)) continue;
      for (const b of centers) {
        if (connected.has(b.id)) continue;
        const dist = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (!best || dist < best.dist) {
          best = { from: a.id, to: b.id, dist };
        }
      }
    }
    if (best) {
      edges.push({ from: best.from, to: best.to });
      connected.add(best.to);
    } else {
      break;
    }
  }
  return edges;
}
