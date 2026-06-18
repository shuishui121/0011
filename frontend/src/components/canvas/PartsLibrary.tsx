import { partTypes } from "./PartIcon";
import type { ElementType } from "@/types";
import { cn } from "@/lib/utils";

interface PartsLibraryProps {
  selectedType: ElementType;
  onSelectType: (type: ElementType) => void;
  onAddElement: () => void;
}

const colorOptions = [
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export default function PartsLibrary({
  selectedType,
  onSelectType,
  onAddElement,
}: PartsLibraryProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-semibold text-sm">零件库</h3>
        <p className="text-xs text-slate-500 mt-0.5">点击添加到画布</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {partTypes.map((part) => (
            <button
              key={part.type}
              onClick={() => {
                onSelectType(part.type);
                onAddElement();
              }}
              className={cn(
                "p-3 rounded-lg border transition-all text-left",
                selectedType === part.type
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
              )}
            >
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                <svg width={40} height={40} viewBox="0 0 40 40">
                  <PartPreview type={part.type} />
                </svg>
              </div>
              <p className="text-xs font-medium text-center">{part.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <h4 className="text-xs font-medium text-slate-400 mb-3">颜色</h4>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded-md border-2 border-slate-700 hover:border-slate-500 transition-colors"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PartPreview({ type }: { type: ElementType }) {
  const color = "#f59e0b";
  const stroke = "#1e293b";

  switch (type) {
    case "gear":
      return (
        <g>
          <circle cx="20" cy="20" r="15" fill={color} stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="20" r="6" fill="white" stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    case "lever":
      return (
        <g>
          <rect x="4" y="17" width="32" height="6" rx="3" fill={color} stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="20" r="5" fill="white" stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    case "pulley":
      return (
        <g>
          <circle cx="20" cy="20" r="14" fill={color} stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="20" r="7" fill="white" stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    case "spring":
      return (
        <path
          d="M 8 8 Q 14 8 14 14 Q 14 20 20 20 Q 26 20 26 26 Q 26 32 32 32"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
        />
      );
    case "piston":
      return (
        <g>
          <rect x="8" y="4" width="24" height="12" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
          <rect x="16" y="16" width="8" height="16" fill={color} stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    case "wheel":
      return (
        <g>
          <circle cx="20" cy="20" r="15" fill={color} stroke={stroke} strokeWidth="1.5" />
          <line x1="20" y1="5" x2="20" y2="35" stroke={stroke} strokeWidth="1.5" />
          <line x1="5" y1="20" x2="35" y2="20" stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="20" r="5" fill="white" stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    case "box":
      return (
        <rect x="5" y="5" width="30" height="30" rx="3" fill={color} stroke={stroke} strokeWidth="1.5" />
      );
    case "arrow":
      return (
        <polygon
          points="32,20 18,10 18,16 4,16 4,24 18,24 18,30"
          fill={color}
          stroke={stroke}
          strokeWidth="1.5"
        />
      );
    case "bearing":
      return (
        <g>
          <circle cx="20" cy="20" r="16" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="20" cy="20" r="8" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="20" cy="8" r="3" fill={color} stroke={stroke} strokeWidth="1" />
          <circle cx="32" cy="20" r="3" fill={color} stroke={stroke} strokeWidth="1" />
          <circle cx="20" cy="32" r="3" fill={color} stroke={stroke} strokeWidth="1" />
          <circle cx="8" cy="20" r="3" fill={color} stroke={stroke} strokeWidth="1" />
        </g>
      );
    case "cam":
      return (
        <g>
          <ellipse cx="20" cy="20" rx="16" ry="10" fill={color} stroke={stroke} strokeWidth="1.5" />
          <circle cx="10" cy="20" r="4" fill="white" stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    default:
      return <rect x="5" y="5" width="30" height="30" fill={color} stroke={stroke} strokeWidth="1.5" />;
  }
}
