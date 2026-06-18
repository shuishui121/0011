import type { ElementType } from "@/types";

export interface OperationRecord {
  type: ElementType;
  timestamp: number;
}

export interface UserHistory {
  sequences: OperationRecord[];
  afterUsage: Record<string, Partial<Record<string, number>>>;
  coOccurrence: Record<string, number>;
  combinations: ElementType[][];
  totalOps: number;
}

const STORAGE_PREFIX = "mojia_part_history_";
const MAX_SEQUENCE_LENGTH = 600;
const MAX_COMBINATIONS = 200;

function createEmptyHistory(): UserHistory {
  return {
    sequences: [],
    afterUsage: {},
    coOccurrence: {},
    combinations: [],
    totalOps: 0,
  };
}

function sortKey(types: ElementType[]): string {
  return [...types].sort().join("|");
}

function safeParse(raw: string | null): UserHistory | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      sequences: Array.isArray(parsed.sequences) ? parsed.sequences : [],
      afterUsage: parsed.afterUsage && typeof parsed.afterUsage === "object" ? parsed.afterUsage : {},
      coOccurrence: parsed.coOccurrence && typeof parsed.coOccurrence === "object" ? parsed.coOccurrence : {},
      combinations: Array.isArray(parsed.combinations) ? parsed.combinations : [],
      totalOps: typeof parsed.totalOps === "number" ? parsed.totalOps : 0,
    };
  } catch {
    return null;
  }
}

class OperationHistoryStore {
  private cache = new Map<number, UserHistory>();
  private pendingFlush = new Set<number>();

  getHistory(userId: number): UserHistory {
    const cached = this.cache.get(userId);
    if (cached) return cached;

    let history: UserHistory | null = null;
    try {
      history = safeParse(localStorage.getItem(STORAGE_PREFIX + userId));
    } catch {
      history = null;
    }
    const result = history ?? createEmptyHistory();
    this.cache.set(userId, result);
    return result;
  }

  private scheduleFlush(userId: number) {
    this.pendingFlush.add(userId);
    if (this.pendingFlush.size === 1) {
      Promise.resolve().then(() => this.flush());
    }
  }

  private flush() {
    const ids = Array.from(this.pendingFlush);
    this.pendingFlush.clear();
    for (const id of ids) {
      const history = this.cache.get(id);
      if (!history) continue;
      try {
        localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(history));
      } catch {
        // 存储失败时静默忽略，避免阻塞主线程
      }
    }
  }

  recordAdd(userId: number, type: ElementType) {
    const history = this.getHistory(userId);
    const last = history.sequences[history.sequences.length - 1];
    if (last && last.type !== type) {
      const after = history.afterUsage[last.type] ?? {};
      after[type] = (after[type] ?? 0) + 1;
      history.afterUsage[last.type] = after;
    } else if (last && last.type === type) {
      const after = history.afterUsage[last.type] ?? {};
      after[type] = (after[type] ?? 0) + 1;
      history.afterUsage[last.type] = after;
    }
    history.sequences.push({ type, timestamp: Date.now() });
    if (history.sequences.length > MAX_SEQUENCE_LENGTH) {
      history.sequences = history.sequences.slice(-MAX_SEQUENCE_LENGTH);
    }
    history.totalOps += 1;
    this.scheduleFlush(userId);
  }

  recordCombination(userId: number, types: ElementType[]) {
    if (types.length < 2) return;
    const history = this.getHistory(userId);
    const key = sortKey(types);
    history.coOccurrence[key] = (history.coOccurrence[key] ?? 0) + 1;
    history.combinations.push([...types]);
    if (history.combinations.length > MAX_COMBINATIONS) {
      history.combinations = history.combinations.slice(-MAX_COMBINATIONS);
    }
    this.scheduleFlush(userId);
  }

  getAfterUsage(userId: number, type: ElementType): Partial<Record<ElementType, number>> {
    const history = this.getHistory(userId);
    return (history.afterUsage[type] ?? {}) as Partial<Record<ElementType, number>>;
  }

  getCoOccurrence(userId: number, types: ElementType[]): number {
    const history = this.getHistory(userId);
    if (types.length < 2) return 0;
    return history.coOccurrence[sortKey(types)] ?? 0;
  }

  getUserStrength(userId: number): number {
    const history = this.getHistory(userId);
    return history.totalOps;
  }

  clearHistory(userId: number) {
    this.cache.set(userId, createEmptyHistory());
    this.scheduleFlush(userId);
  }
}

export const operationHistory = new OperationHistoryStore();
