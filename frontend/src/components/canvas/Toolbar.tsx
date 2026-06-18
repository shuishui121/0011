import { MousePointer2, Hand, Plug, Type, ZoomIn, ZoomOut, Grid3X3 } from "lucide-react";
import type { ElementType } from "@/types";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";

type Tool = "select" | "pan" | "add-element" | "connect" | "annotation";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  selectedElementType: ElementType;
  onSelectedElementTypeChange: (type: ElementType) => void;
}

export default function Toolbar({
  tool,
  onToolChange,
  selectedElementType,
  onSelectedElementTypeChange,
}: ToolbarProps) {
  const { zoom, setZoom } = useCanvasStore();

  const tools = [
    { id: "select", icon: MousePointer2, label: "选择 (V)" },
    { id: "pan", icon: Hand, label: "平移 (H)" },
    { id: "connect", icon: Plug, label: "连线 (C)" },
    { id: "annotation", icon: Type, label: "标注 (T)" },
  ] as const;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur px-2 py-1.5 rounded-xl border border-slate-700 z-10">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id as Tool)}
            className={cn(
              "p-2.5 rounded-lg transition-colors relative group",
              isActive
                ? "bg-amber-500 text-slate-900"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
            title={t.label}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}

      <div className="w-px h-6 bg-slate-700 mx-1" />

      <button
        onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
        className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      <span className="text-xs font-medium text-slate-400 w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => setZoom(Math.min(4, zoom + 0.1))}
        className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
    </div>
  );
}
