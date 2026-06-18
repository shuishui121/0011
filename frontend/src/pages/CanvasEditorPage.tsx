import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { documentsAPI } from "@/lib/api";
import type { DesignDocument, ElementType } from "@/types";
import Canvas from "@/components/canvas/Canvas";
import Toolbar from "@/components/canvas/Toolbar";
import PartsLibrary from "@/components/canvas/PartsLibrary";
import PropertiesPanel from "@/components/canvas/PropertiesPanel";
import { ArrowLeft, Save, Menu } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";

type Tool = "select" | "pan" | "add-element" | "connect" | "annotation";

export default function CanvasEditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DesignDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedElementType, setSelectedElementType] = useState<ElementType>("gear");
  const [isSaving, setIsSaving] = useState(false);
  const [showPartsPanel, setShowPartsPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);

  const { document: canvasContent, setDocument: setCanvasDocument } = useCanvasStore();

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const data = await documentsAPI.get(Number(documentId));
      setDocument(data);
      if (data.content) {
        setCanvasDocument(data.content, data.current_version || 0);
      }
    } catch (error) {
      console.error("加载文档失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!documentId || !canvasContent) return;

    setIsSaving(true);
    try {
      await documentsAPI.createVersion(
        Number(documentId),
        canvasContent,
        "自动保存"
      );
      await loadDocument();
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddElement = () => {
    setTool("add-element");
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate(`/projects/${document?.project_id}`)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{document?.name}</h1>
          <p className="text-xs text-slate-500">
            版本 {document?.current_version} · {document?.description || "无描述"}
          </p>
        </div>

        <button
          onClick={() => setShowPartsPanel(!showPartsPanel)}
          className={`p-2 rounded-lg transition-colors ${
            showPartsPanel ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-800"
          }`}
          title="零件库"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "保存中..." : "保存"}
        </button>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0">
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            selectedElementType={selectedElementType}
            onSelectedElementTypeChange={setSelectedElementType}
          />

          {documentId && (
            <Canvas
              documentId={Number(documentId)}
              tool={tool}
              selectedElementType={selectedElementType}
            />
          )}
        </div>

        {showPartsPanel && (
          <div className="absolute left-0 top-0 h-full z-10">
            <PartsLibrary
              selectedType={selectedElementType}
              onSelectType={setSelectedElementType}
              onAddElement={handleAddElement}
            />
          </div>
        )}

        {showPropertiesPanel && documentId && (
          <div className="absolute right-0 top-0 h-full z-10">
            <PropertiesPanel documentId={Number(documentId)} />
          </div>
        )}
      </div>
    </div>
  );
}
