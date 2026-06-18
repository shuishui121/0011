import { useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import {
  Settings,
  History,
  MessageSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import VersionPanel from "./VersionPanel";
import CommentsPanel from "./CommentsPanel";
import { useCollaboration } from "@/hooks/useCollaboration";

interface Props {
  documentId: number;
}

type Tab = "properties" | "versions" | "comments" | "collaborators";

export default function PropertiesPanel({ documentId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("properties");

  const { document, selectedElementId, collaborators, updateElement } = useCanvasStore();
  const { sendOperation } = useCollaboration({ documentId });

  const selectedElement = document?.elements.find((el) => el.id === selectedElementId);

  const tabs = [
    { id: "properties", icon: Settings, label: "属性" },
    { id: "versions", icon: History, label: "版本" },
    { id: "comments", icon: MessageSquare, label: "评论" },
    { id: "collaborators", icon: Users, label: "协作" },
  ];

  const handleUpdateElement = (id: string, data: any) => {
    const op = updateElement(id, data);
    sendOperation(op.toJSON());
  };

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col">
      <div className="flex border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "properties" && (
          <div className="p-4 space-y-4">
            {selectedElement ? (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3">元素属性</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">类型</label>
                      <div className="px-3 py-2 bg-slate-800 rounded-lg text-sm capitalize">
                        {selectedElement.type}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">标签</label>
                      <input
                        type="text"
                        value={selectedElement.label || ""}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, { label: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="输入标签"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">X</label>
                        <input
                          type="number"
                          value={Math.round(selectedElement.x)}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              x: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Y</label>
                        <input
                          type="number"
                          value={Math.round(selectedElement.y)}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              y: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">宽度</label>
                        <input
                          type="number"
                          value={Math.round(selectedElement.width)}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              width: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">高度</label>
                        <input
                          type="number"
                          value={Math.round(selectedElement.height)}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              height: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">颜色</label>
                      <input
                        type="color"
                        value={selectedElement.color || "#f59e0b"}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, { color: e.target.value })
                        }
                        className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                选择一个元素查看属性
              </div>
            )}
          </div>
        )}

        {activeTab === "versions" && <VersionPanel documentId={documentId} />}

        {activeTab === "comments" && <CommentsPanel documentId={documentId} />}

        {activeTab === "collaborators" && (
          <div className="p-4">
            <h4 className="text-sm font-medium mb-3">在线协作者</h4>
            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <p className="text-sm text-slate-500">暂无其他协作者</p>
              ) : (
                collaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: c.avatar_color }}
                    >
                      {c.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.username}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        在线
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
