import json
import uuid
from typing import List, Dict, Any, Optional


class OTOperation:
    def __init__(
        self,
        op_type: str,
        target_type: str,
        target_id: str,
        data: Dict[str, Any] = None,
        user_id: int = None,
        timestamp: float = None,
        op_id: str = None,
    ):
        self.op_id = op_id or str(uuid.uuid4())
        self.op_type = op_type
        self.target_type = target_type
        self.target_id = target_id
        self.data = data or {}
        self.user_id = user_id
        self.timestamp = timestamp

    def to_dict(self) -> Dict[str, Any]:
        return {
            "op_id": self.op_id,
            "op_type": self.op_type,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "data": self.data,
            "user_id": self.user_id,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "OTOperation":
        return cls(
            op_id=data.get("op_id"),
            op_type=data["op_type"],
            target_type=data["target_type"],
            target_id=data["target_id"],
            data=data.get("data", {}),
            user_id=data.get("user_id"),
            timestamp=data.get("timestamp"),
        )


class OTAlgorithm:
    @staticmethod
    def transform(
        op_a: OTOperation,
        op_b: OTOperation,
    ) -> Optional[OTOperation]:
        if op_a.target_id != op_b.target_id or op_a.target_type != op_b.target_type:
            return op_b

        if op_a.op_type == "delete" or op_b.op_type == "delete":
            if op_a.op_type == "delete":
                return None
            if op_b.op_type == "delete":
                return OTOperation(
                    op_id=op_b.op_id,
                    op_type="delete",
                    target_type=op_b.target_type,
                    target_id=op_b.target_id,
                    data=op_b.data,
                    user_id=op_b.user_id,
                    timestamp=op_b.timestamp,
                )

        if op_a.op_type == "add" and op_b.op_type == "add":
            return op_b

        if op_a.op_type == "update" and op_b.op_type == "update":
            merged_data = op_b.data.copy()
            for key, value in op_a.data.items():
                if key not in merged_data:
                    merged_data[key] = value
                elif isinstance(value, dict) and isinstance(merged_data[key], dict):
                    merged = {**value, **merged_data[key]}
                    merged_data[key] = merged
            return OTOperation(
                op_id=op_b.op_id,
                op_type="update",
                target_type=op_b.target_type,
                target_id=op_b.target_id,
                data=merged_data,
                user_id=op_b.user_id,
                timestamp=op_b.timestamp,
            )

        if op_a.op_type == "add" and op_b.op_type == "update":
            return op_b

        if op_a.op_type == "update" and op_b.op_type == "add":
            return op_b

        return op_b

    @staticmethod
    def apply_operation(
        document: Dict[str, Any],
        operation: OTOperation,
    ) -> Dict[str, Any]:
        doc = json.loads(json.dumps(document))
        target_list = doc.get(f"{operation.target_type}s", [])

        if operation.op_type == "add":
            new_item = {"id": operation.target_id, **operation.data}
            target_list.append(new_item)
            doc[f"{operation.target_type}s"] = target_list

        elif operation.op_type == "delete":
            doc[f"{operation.target_type}s"] = [
                item for item in target_list if item.get("id") != operation.target_id
            ]

        elif operation.op_type == "update":
            for i, item in enumerate(target_list):
                if item.get("id") == operation.target_id:
                    target_list[i] = {**item, **operation.data}
                    break
            doc[f"{operation.target_type}s"] = target_list

        return doc

    @staticmethod
    def transform_operations(
        server_ops: List[OTOperation],
        client_op: OTOperation,
    ) -> OTOperation:
        result_op = client_op
        for server_op in server_ops:
            transformed = OTAlgorithm.transform(server_op, result_op)
            if transformed is None:
                return None
            result_op = transformed
        return result_op
