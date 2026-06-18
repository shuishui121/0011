import { v4 as uuidv4 } from "uuid";
import type {
  CanvasElement,
  Connection,
  Annotation,
  DocumentContent,
  OTOperationData,
} from "@/types";

export function generateId(): string {
  return uuidv4();
}

export class OTOperation {
  op_id: string;
  op_type: "add" | "delete" | "update";
  target_type: "element" | "connection" | "annotation";
  target_id: string;
  data: Record<string, any>;
  user_id?: number;
  timestamp?: number;

  constructor(
    op_type: "add" | "delete" | "update",
    target_type: "element" | "connection" | "annotation",
    target_id: string,
    data: Record<string, any> = {},
    op_id?: string
  ) {
    this.op_id = op_id || generateId();
    this.op_type = op_type;
    this.target_type = target_type;
    this.target_id = target_id;
    this.data = data;
  }

  toJSON(): OTOperationData {
    return {
      op_id: this.op_id,
      op_type: this.op_type,
      target_type: this.target_type,
      target_id: this.target_id,
      data: this.data,
      user_id: this.user_id,
      timestamp: this.timestamp,
    };
  }

  static fromJSON(data: OTOperationData): OTOperation {
    const op = new OTOperation(
      data.op_type,
      data.target_type,
      data.target_id,
      data.data,
      data.op_id
    );
    op.user_id = data.user_id;
    op.timestamp = data.timestamp;
    return op;
  }
}

export function transformOperation(
  opA: OTOperation,
  opB: OTOperation
): OTOperation | null {
  if (opA.target_id !== opB.target_id || opA.target_type !== opB.target_type) {
    return opB;
  }

  if (opA.op_type === "delete" || opB.op_type === "delete") {
    if (opA.op_type === "delete") {
      return null;
    }
    return opB;
  }

  if (opA.op_type === "add" && opB.op_type === "add") {
    return opB;
  }

  if (opA.op_type === "update" && opB.op_type === "update") {
    const mergedData = { ...opB.data };
    for (const key of Object.keys(opA.data)) {
      if (!(key in mergedData)) {
        mergedData[key] = opA.data[key];
      } else if (
        typeof opA.data[key] === "object" &&
        typeof mergedData[key] === "object" &&
        opA.data[key] !== null &&
        mergedData[key] !== null
      ) {
        mergedData[key] = { ...opA.data[key], ...mergedData[key] };
      }
    }
    return new OTOperation(opB.op_type, opB.target_type, opB.target_id, mergedData, opB.op_id);
  }

  return opB;
}

export function applyOperation(
  document: DocumentContent,
  operation: OTOperation
): DocumentContent {
  const doc = JSON.parse(JSON.stringify(document)) as DocumentContent;
  const targetKey = `${operation.target_type}s` as keyof DocumentContent;

  if (operation.op_type === "add") {
    const newItem = { id: operation.target_id, ...operation.data } as any;
    (doc[targetKey] as any[]).push(newItem);
  } else if (operation.op_type === "delete") {
    (doc[targetKey] as any[]) = (doc[targetKey] as any[]).filter(
      (item: any) => item.id !== operation.target_id
    );
  } else if (operation.op_type === "update") {
    const list = doc[targetKey] as any[];
    const index = list.findIndex((item: any) => item.id === operation.target_id);
    if (index !== -1) {
      list[index] = { ...list[index], ...operation.data };
    }
  }

  return doc;
}

export function createAddElementOperation(element: CanvasElement): OTOperation {
  const { id, ...data } = element;
  return new OTOperation("add", "element", id, data);
}

export function createUpdateElementOperation(
  id: string,
  data: Partial<CanvasElement>
): OTOperation {
  return new OTOperation("update", "element", id, data);
}

export function createDeleteElementOperation(id: string): OTOperation {
  return new OTOperation("delete", "element", id);
}

export function createAddConnectionOperation(connection: Connection): OTOperation {
  const { id, ...data } = connection;
  return new OTOperation("add", "connection", id, data);
}

export function createUpdateConnectionOperation(
  id: string,
  data: Partial<Connection>
): OTOperation {
  return new OTOperation("update", "connection", id, data);
}

export function createDeleteConnectionOperation(id: string): OTOperation {
  return new OTOperation("delete", "connection", id);
}

export function createAddAnnotationOperation(annotation: Annotation): OTOperation {
  const { id, ...data } = annotation;
  return new OTOperation("add", "annotation", id, data);
}

export function createUpdateAnnotationOperation(
  id: string,
  data: Partial<Annotation>
): OTOperation {
  return new OTOperation("update", "annotation", id, data);
}

export function createDeleteAnnotationOperation(id: string): OTOperation {
  return new OTOperation("delete", "annotation", id);
}
