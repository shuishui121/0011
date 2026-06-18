import { useRef, useState, useCallback, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { CanvasElement, Connection, Annotation, ElementType } from "@/types";
import PartIcon from "./PartIcon";
import CollaborationCursors from "./CollaborationCursors";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useAuthStore } from "@/stores/authStore";

interface CanvasProps {
  documentId: number;
  tool: "select" | "pan" | "add-element" | "connect" | "annotation";
  selectedElementType?: ElementType;
  annotationType?: "note" | "dimension" | "comment";
}

export default function Canvas({
  documentId,
  tool,
  selectedElementType,
  annotationType = "note",
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragElementId, setDragElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const {
    document,
    zoom,
    panOffset,
    selectedElementId,
    setZoom,
    setPanOffset,
    setSelectedElement,
    addElement,
    updateElement,
    deleteElement,
    addConnection,
    addAnnotation,
  } = useCanvasStore();

  const user = useAuthStore((s) => s.user);

  const { sendOperation, sendCursorUpdate, isConnected } = useCollaboration({
    documentId,
  });

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - panOffset.x) / zoom;
      const y = (clientY - rect.top - panOffset.y) / zoom;
      return { x, y };
    },
    [zoom, panOffset]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.25, Math.min(4, zoom + delta));

      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newPanX = mouseX - ((mouseX - panOffset.x) * newZoom) / zoom;
        const newPanY = mouseY - ((mouseY - panOffset.y) * newZoom) / zoom;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    },
    [zoom, panOffset, setZoom, setPanOffset]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const point = getCanvasPoint(e.clientX, e.clientY);

    if (tool === "pan") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (tool === "select") {
      const clickedElement = findElementAtPoint(point.x, point.y);
      if (clickedElement) {
        setSelectedElement(clickedElement.id);
        setIsDragging(true);
        setDragElementId(clickedElement.id);
        setDragOffset({
          x: point.x - clickedElement.x,
          y: point.y - clickedElement.y,
        });
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (tool === "add-element" && selectedElementType) {
      const size = 60;
      const op = addElement({
        type: selectedElementType,
        x: point.x - size / 2,
        y: point.y - size / 2,
        width: size,
        height: size,
        color: "#f59e0b",
        label: "",
        properties: {},
      });
      sendOperation(op.toJSON());
      return;
    }

    if (tool === "connect") {
      const element = findElementAtPoint(point.x, point.y);
      if (element) {
        if (!connectingFrom) {
          setConnectingFrom(element.id);
        } else if (connectingFrom !== element.id) {
          const op = addConnection({
            from: connectingFrom,
            to: element.id,
            type: "solid",
            label: "",
            color: "#64748b",
          });
          sendOperation(op.toJSON());
          setConnectingFrom(null);
        }
      }
      return;
    }

    if (tool === "annotation") {
      const op = addAnnotation({
        x: point.x,
        y: point.y,
        text: "标注",
        type: annotationType,
        targetId: undefined,
      });
      sendOperation(op.toJSON());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY);
    setMousePos(point);

    sendCursorUpdate(point, selectedElementId || null);

    if (tool === "pan" && isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    if (tool === "select" && isDragging && dragElementId) {
      const element = document?.elements.find((el) => el.id === dragElementId);
      if (element) {
        const newX = point.x - dragOffset.x;
        const newY = point.y - dragOffset.y;
        const op = updateElement(dragElementId, { x: newX, y: newY });
        sendOperation(op.toJSON());
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragElementId(null);
  };

  const findElementAtPoint = (x: number, y: number): CanvasElement | null => {
    if (!document) return null;
    for (let i = document.elements.length - 1; i >= 0; i--) {
      const el = document.elements[i];
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        return el;
      }
    }
    return null;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementId) {
          const op = deleteElement(selectedElementId);
          sendOperation(op.toJSON());
          setSelectedElement(null);
        }
      }
    },
    [selectedElementId, deleteElement, sendOperation, setSelectedElement]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getElementCenter = (element: CanvasElement) => ({
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  });

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  const gridSize = document.settings.gridSize;
  const showGrid = document.settings.showGrid;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-slate-950"
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        style={{ cursor: tool === "pan" ? (isDragging ? "grabbing" : "grab") : undefined }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize * zoom}
            height={gridSize * zoom}
            patternUnits="userSpaceOnUse"
            x={panOffset.x}
            y={panOffset.y}
          >
            <path
              d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {document.connections.map((conn) => {
            const fromEl = document.elements.find((el) => el.id === conn.from);
            const toEl = document.elements.find((el) => el.id === conn.to);
            if (!fromEl || !toEl) return null;

            const from = getElementCenter(fromEl);
            const to = getElementCenter(toEl);

            const strokeDasharray =
              conn.type === "dashed" ? "8,4" : conn.type === "dotted" ? "2,2" : undefined;

            return (
              <g key={conn.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={conn.color || "#64748b"}
                  strokeWidth={2}
                  strokeDasharray={strokeDasharray}
                />
                {conn.label && (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 8}
                    fill="#94a3b8"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}

          {document.annotations.map((ann) => (
            <g key={ann.id} transform={`translate(${ann.x}, ${ann.y})`}>
              {ann.type === "note" && (
                <g>
                  <rect
                    x={0}
                    y={0}
                    width={80}
                    height={40}
                    fill="#fef3c7"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    rx={4}
                  />
                  <text x={8} y={20} fill="#78350f" fontSize="11" textAnchor="start">
                    {ann.text}
                  </text>
                </g>
              )}
              {ann.type === "dimension" && (
                <g>
                  <line x1={0} y1={0} x2={60} y2={0} stroke="#60a5fa" strokeWidth={1.5} />
                  <line x1={0} y1={-5} x2={0} y2={5} stroke="#60a5fa" strokeWidth={1.5} />
                  <line x1={60} y1={-5} x2={60} y2={5} stroke="#60a5fa" strokeWidth={1.5} />
                  <text x={30} y={-8} fill="#60a5fa" fontSize="11" textAnchor="middle">
                    {ann.text}
                  </text>
                </g>
              )}
              {ann.type === "comment" && (
                <g>
                  <circle cx={0} cy={0} r={12} fill="#ef4444" stroke="white" strokeWidth={2} />
                  <text x={0} y={4} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">
                    !
                  </text>
                </g>
              )}
            </g>
          ))}

          {document.elements.map((element) => (
            <g key={element.id}>
              <PartIcon
                type={element.type}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                color={element.color}
                selected={selectedElementId === element.id}
              />
              {element.label && (
                <text
                  x={element.x + element.width / 2}
                  y={element.y - 8}
                  fill="#e2e8f0"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {element.label}
                </text>
              )}
              {selectedElementId === element.id && (
                <rect
                  x={element.x - 4}
                  y={element.y - 4}
                  width={element.width + 8}
                  height={element.height + 8}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4,2"
                  rx={6}
                />
              )}
            </g>
          ))}

          {connectingFrom && (
            <line
              x1={
                document.elements.find((el) => el.id === connectingFrom)
                  ? getElementCenter(
                      document.elements.find((el) => el.id === connectingFrom)!
                    ).x
                  : 0
              }
              y1={
                document.elements.find((el) => el.id === connectingFrom)
                  ? getElementCenter(
                      document.elements.find((el) => el.id === connectingFrom)!
                    ).y
                  : 0
              }
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6,4"
            />
          )}

          <CollaborationCursors />
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700">
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <span className="text-sm font-medium w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(Math.min(4, zoom + 0.1))}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 text-sm text-slate-500">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        {isConnected ? "已连接" : "未连接"}
      </div>
    </div>
  );
}
