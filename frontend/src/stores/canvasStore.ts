import { create } from "zustand";
import type {
  CanvasElement,
  Connection,
  Annotation,
  DocumentContent,
  Collaborator,
  OTOperationData,
} from "@/types";
import {
  OTOperation,
  applyOperation,
  transformOperation,
  generateId,
} from "@/lib/ot";

interface CanvasState {
  document: DocumentContent | null;
  version: number;
  selectedElementId: string | null;
  selectedConnectionId: string | null;
  collaborators: Collaborator[];
  canEdit: boolean;
  isLoading: boolean;
  zoom: number;
  panOffset: { x: number; y: number };

  pendingOperations: Map<string, OTOperation>;
  localVersion: number;

  setDocument: (doc: DocumentContent, version: number) => void;
  setVersion: (version: number) => void;
  setSelectedElement: (id: string | null) => void;
  setSelectedConnection: (id: string | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  updateCollaboratorCursor: (collaborator: Collaborator) => void;
  removeCollaborator: (userId: number) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  setCanEdit: (canEdit: boolean) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;

  addElement: (element: Omit<CanvasElement, "id">) => OTOperation;
  updateElement: (id: string, data: Partial<CanvasElement>) => OTOperation;
  deleteElement: (id: string) => OTOperation;
  addConnection: (connection: Omit<Connection, "id">) => OTOperation;
  updateConnection: (id: string, data: Partial<Connection>) => OTOperation;
  deleteConnection: (id: string) => OTOperation;
  addAnnotation: (annotation: Omit<Annotation, "id">) => OTOperation;
  updateAnnotation: (id: string, data: Partial<Annotation>) => OTOperation;
  deleteAnnotation: (id: string) => OTOperation;

  applyLocalOperation: (op: OTOperation) => void;
  applyRemoteOperation: (opData: OTOperationData, remoteVersion: number) => void;
  acknowledgeOperation: (opId: string, newVersion: number) => void;
  transformPendingOperations: (serverOp: OTOperation) => void;
}

const initialDocument: DocumentContent = {
  elements: [],
  connections: [],
  annotations: [],
  settings: {
    gridSize: 20,
    showGrid: true,
  },
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  document: initialDocument,
  version: 0,
  selectedElementId: null,
  selectedConnectionId: null,
  collaborators: [],
  canEdit: false,
  isLoading: true,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  pendingOperations: new Map(),
  localVersion: 0,

  setDocument: (doc, version) =>
    set({
      document: {
        ...doc,
        elements: doc.elements ?? [],
        connections: doc.connections ?? [],
        annotations: doc.annotations ?? [],
        settings: {
          gridSize: 20,
          showGrid: true,
          ...(doc.settings ?? {}),
        },
      },
      version,
      localVersion: version,
      isLoading: false,
    }),

  setVersion: (version) => set({ version, localVersion: version }),

  setSelectedElement: (id) => set({ selectedElementId: id, selectedConnectionId: null }),

  setSelectedConnection: (id) => set({ selectedConnectionId: id, selectedElementId: null }),

  setCollaborators: (collaborators) => set({ collaborators }),

  updateCollaboratorCursor: (collab) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.user_id === collab.user_id
          ? {
              ...c,
              cursor_position: collab.cursor_position,
              selected_element: collab.selected_element,
            }
          : c
      ),
    })),

  removeCollaborator: (userId) =>
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.user_id !== userId),
    })),

  addCollaborator: (collab) =>
    set((state) => {
      if (state.collaborators.some((c) => c.user_id === collab.user_id)) {
        return state;
      }
      return { collaborators: [...state.collaborators, collab] };
    }),

  setCanEdit: (canEdit) => set({ canEdit }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  setPanOffset: (offset) => set({ panOffset: offset }),

  addElement: (element) => {
    const id = generateId();
    const newElement = { ...element, id } as CanvasElement;
    const op = new OTOperation("add", "element", id, element);
    get().applyLocalOperation(op);
    return op;
  },

  updateElement: (id, data) => {
    const op = new OTOperation("update", "element", id, data);
    get().applyLocalOperation(op);
    return op;
  },

  deleteElement: (id) => {
    const op = new OTOperation("delete", "element", id);
    get().applyLocalOperation(op);
    return op;
  },

  addConnection: (connection) => {
    const id = generateId();
    const op = new OTOperation("add", "connection", id, connection);
    get().applyLocalOperation(op);
    return op;
  },

  updateConnection: (id, data) => {
    const op = new OTOperation("update", "connection", id, data);
    get().applyLocalOperation(op);
    return op;
  },

  deleteConnection: (id) => {
    const op = new OTOperation("delete", "connection", id);
    get().applyLocalOperation(op);
    return op;
  },

  addAnnotation: (annotation) => {
    const id = generateId();
    const op = new OTOperation("add", "annotation", id, annotation);
    get().applyLocalOperation(op);
    return op;
  },

  updateAnnotation: (id, data) => {
    const op = new OTOperation("update", "annotation", id, data);
    get().applyLocalOperation(op);
    return op;
  },

  deleteAnnotation: (id) => {
    const op = new OTOperation("delete", "annotation", id);
    get().applyLocalOperation(op);
    return op;
  },

  applyLocalOperation: (op) => {
    const state = get();
    if (!state.document) return;

    const newDoc = applyOperation(state.document, op);
    const newPending = new Map(state.pendingOperations);
    newPending.set(op.op_id, op);

    set({
      document: newDoc,
      pendingOperations: newPending,
    });
  },

  applyRemoteOperation: (opData, remoteVersion) => {
    const state = get();
    if (!state.document) return;

    const remoteOp = OTOperation.fromJSON(opData);

    const pendingOps = Array.from(state.pendingOperations.values());
    let transformedOp = remoteOp;
    for (const pendingOp of pendingOps) {
      const result = transformOperation(pendingOp, transformedOp);
      if (!result) return;
      transformedOp = result;
    }

    const newDoc = applyOperation(state.document, transformedOp);
    set({
      document: newDoc,
      version: remoteVersion,
    });
  },

  acknowledgeOperation: (opId, newVersion) => {
    set((state) => {
      const newPending = new Map(state.pendingOperations);
      newPending.delete(opId);
      return {
        pendingOperations: newPending,
        version: newVersion,
      };
    });
  },

  transformPendingOperations: (serverOp) => {
    set((state) => {
      const newPending = new Map<string, OTOperation>();
      for (const [opId, op] of state.pendingOperations) {
        const transformed = transformOperation(serverOp, op);
        if (transformed) {
          newPending.set(opId, transformed);
        }
      }
      return { pendingOperations: newPending };
    });
  },
}));
