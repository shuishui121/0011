import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useAuthStore } from "@/stores/authStore";
import type { OTOperationData } from "@/types";

const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

interface UseCollaborationOptions {
  documentId: number;
  onInit?: (data: any) => void;
}

export function useCollaboration({ documentId, onInit }: UseCollaborationOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const isManualCloseRef = useRef(false);

  const {
    setDocument,
    setCollaborators,
    setCanEdit,
    applyRemoteOperation,
    acknowledgeOperation,
    updateCollaboratorCursor,
    addCollaborator,
    removeCollaborator,
    version,
  } = useCanvasStore();

  const token = useAuthStore((s) => s.token);

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = `${WS_BASE_URL}/ws/documents/${documentId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "init":
          setDocument(message.content, message.version);
          setCollaborators(message.collaborators);
          setCanEdit(message.can_edit);
          onInit?.(message);
          break;

        case "operation":
          applyRemoteOperation(message.operation, message.version);
          break;

        case "operation_ack":
          acknowledgeOperation(message.op_id, message.new_version);
          break;

        case "operation_rejected":
          console.warn("Operation rejected:", message.reason);
          break;

        case "cursor_update":
          updateCollaboratorCursor({
            user_id: message.user_id,
            username: message.username,
            avatar_color: message.avatar_color,
            cursor_position: message.position,
            selected_element: message.selected_element,
          });
          break;

        case "user_joined":
          addCollaborator(message.user);
          break;

        case "user_left":
          removeCollaborator(message.user_id);
          break;

        case "error":
          console.error("WebSocket error:", message.message);
          break;

        case "pong":
          break;
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      wsRef.current = null;

      if (!isManualCloseRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [documentId, token, setDocument, setCollaborators, setCanEdit, applyRemoteOperation, acknowledgeOperation, updateCollaboratorCursor, addCollaborator, removeCollaborator, onInit]);

  useEffect(() => {
    if (documentId && token) {
      isManualCloseRef.current = false;
      connect();
    }

    return () => {
      isManualCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [documentId, token, connect]);

  const sendOperation = useCallback((opData: OTOperationData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "operation",
          operation: opData,
          since_version: version,
        })
      );
    }
  }, [version]);

  const sendCursorUpdate = useCallback(
    (position: { x: number; y: number } | null, selectedElement: string | null) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "cursor_update",
            position,
            selected_element: selectedElement,
          })
        );
      }
    },
    []
  );

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  return {
    isConnected,
    sendOperation,
    sendCursorUpdate,
    sendPing,
  };
}
