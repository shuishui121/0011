import { useMemo, useState, useDeferredValue } from "react";
import { Sparkles, Search, Plus, X } from "lucide-react";
import type { ElementType } from "@/types";
import { useCanvasStore } from "@/stores/canvasStore";
import { useAuthStore } from "@/stores/authStore";
import { useCollaboration } from "@/hooks/useCollaboration";
import { getSuggestions, searchParts, recordAdd } from "@/lib/recommendationEngine";
import { partMeta, getCategoryLabel } from "@/lib/partCategories";
import PartIcon from "./PartIcon";
import { cn } from "@/lib/utils";

interface SuggestionPanelProps {
  documentId: number;
}

export default function SuggestionPanel({ documentId }: SuggestionPanelProps) {
  const { document, addElement, selectedElementId, lastAddedElement } = useCanvasStore();
  const user = useAuthStore((s) => s.user);
  const { sendOperation } = useCollaboration({ documentId });

  const [query, setQuery] = useState("");
  const [previewType, setPreviewType] = useState<ElementType | null>(null);
  const deferredQuery = useDeferredValue(query);

  const userId = user?.id ?? 0;

  const canvasTypes = useMemo(
    () => (document?.elements.map((e) => e.type) ?? []) as ElementType[],
    [document?.elements]
  );

  const triggerType: ElementType | null =
    lastAddedElement?.type ??
    document?.elements.find((e) => e.id === selectedElementId)?.type ??
    null;

  const suggestions = useMemo(
    () =>
      getSuggestions(
        { userId, currentType: triggerType, canvasTypes },
        6
      ),
    [userId, triggerType, canvasTypes]
  );

  const searchResults = useMemo(
    () => searchParts(deferredQuery, userId),
    [deferredQuery, userId]
  );

  const handleAdd = (type: ElementType) => {
    const selected = document?.elements.find((e) => e.id === selectedElementId);
    const size = 60;
    const x = selected ? selected.x + selected.width + 24 : 120;
    const y = selected ? selected.y : 120;
    const op = addElement({
      type,
      x,
      y,
      width: size,
      height: size,
      color: "#f59e0b",
      label: "",
      properties: {},
    });
    sendOperation(op.toJSON());
    recordAdd(userId, type);
  };

  const isSearching = query.trim().length > 0;

  return (
    <div className="relative shrink-0 border-t border-slate-800 bg-slate-950/40">
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-300">智能零件建议</h4>
          {triggerType && (
            <span className="ml-auto text-[10px] text-slate-500 truncate max-w-[100px]">
              基于 {partMeta[triggerType].label}
            </span>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索零件，如“传动”"
            className="w-full pl-8 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-slate-600"
          />
          {isSearching && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isSearching ? (
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">未找到相关零件</p>
            ) : (
              searchResults.map((r) => (
                <button
                  key={r.type}
                  onClick={() => handleAdd(r.type)}
                  onMouseEnter={() => setPreviewType(r.type)}
                  onMouseLeave={() => setPreviewType(null)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 border border-transparent transition-colors group text-left"
                >
                  <PartThumb type={r.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{r.label}</span>
                      {r.usedByUser && (
                        <span className="text-[9px] px-1 py-px rounded bg-emerald-500/20 text-emerald-400">
                          常用
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {r.categoryLabel} · {r.matchedAlias}
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400" />
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">暂无建议</p>
            ) : (
              suggestions.map((rec) => (
                <button
                  key={rec.type}
                  onClick={() => handleAdd(rec.type)}
                  onMouseEnter={() => setPreviewType(rec.type)}
                  onMouseLeave={() => setPreviewType(null)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 border border-transparent transition-colors group text-left"
                >
                  <PartThumb type={rec.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{rec.label}</span>
                      {rec.fromUser && (
                        <span className="text-[9px] px-1 py-px rounded bg-emerald-500/20 text-emerald-400">
                          习惯
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {rec.reason}
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {previewType && (
        <div className="absolute left-2 z-30 pointer-events-none">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
            <svg width={72} height={72} viewBox="0 0 72 72">
              <PartIcon
                type={previewType}
                x={0}
                y={0}
                width={72}
                height={72}
                color="#f59e0b"
              />
            </svg>
            <p className="text-xs font-medium text-center mt-1">
              {partMeta[previewType].label}
            </p>
            <p className="text-[10px] text-slate-500 text-center">
              {getCategoryLabel(partMeta[previewType].category)}类
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PartThumb({ type }: { type: ElementType }) {
  return (
    <div
      className={cn(
        "w-9 h-9 shrink-0 flex items-center justify-center rounded-md bg-slate-900/60 border border-slate-700"
      )}
    >
      <svg width={30} height={30} viewBox="0 0 30 30">
        <PartIcon type={type} x={0} y={0} width={30} height={30} color="#f59e0b" />
      </svg>
    </div>
  );
}
