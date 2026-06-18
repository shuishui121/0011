import { useState, useEffect } from "react";
import { documentsAPI } from "@/lib/api";
import type { DocumentVersion } from "@/types";
import { History, Clock, RotateCcw, Save, Diff } from "lucide-react";

interface Props {
  documentId: number;
}

export default function VersionPanel({ documentId }: Props) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveDescription, setSaveDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (documentId) {
      loadVersions();
    }
  }, [documentId]);

  const loadVersions = async () => {
    try {
      const data = await documentsAPI.listVersions(documentId);
      setVersions(data);
    } catch (error) {
      console.error("加载版本失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!documentId || !saveDescription.trim()) return;

    setIsSaving(true);
    try {
      const content = (window as any).__canvasContent || {};
      await documentsAPI.createVersion(documentId, content, saveDescription.trim());
      setSaveDescription("");
      await loadVersions();
    } catch (error) {
      console.error("保存版本失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async (versionNumber: number) => {
    if (!confirm(`确定要回退到版本 ${versionNumber} 吗？这将创建一个新版本。`)) return;

    try {
      await documentsAPI.revertToVersion(documentId, versionNumber);
      await loadVersions();
    } catch (error) {
      console.error("回退版本失败:", error);
    }
  };

  const handleViewVersion = async (versionNumber: number) => {
    try {
      const version = await documentsAPI.getVersion(documentId, versionNumber);
      setSelectedVersion(versionNumber);
      console.log("版本内容:", version.content);
    } catch (error) {
      console.error("查看版本失败:", error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Save className="w-4 h-4 text-green-400" />
          保存新版本
        </h4>
        <textarea
          value={saveDescription}
          onChange={(e) => setSaveDescription(e.target.value)}
          placeholder="描述本次保存的内容..."
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
          rows={2}
        />
        <button
          onClick={handleSaveVersion}
          disabled={isSaving || !saveDescription.trim()}
          className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-900 text-sm font-semibold rounded-lg transition-colors"
        >
          {isSaving ? "保存中..." : "保存版本"}
        </button>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          历史版本
        </h4>

        {isLoading ? (
          <div className="text-center py-6 text-slate-500 text-sm">加载中...</div>
        ) : versions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">暂无版本记录</div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedVersion === version.version_number
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                }`}
                onClick={() => handleViewVersion(version.version_number)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">版本 {version.version_number}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevert(version.version_number);
                    }}
                    className="p-1 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                    title="回退到此版本"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                  {version.description || "无描述"}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: version.creator?.avatar_color || "#666" }}
                  />
                  <span>{version.creator?.username || "未知"}</span>
                  <span>·</span>
                  <Clock className="w-3 h-3" />
                  <span>{new Date(version.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
