import { useCanvasStore } from "@/stores/canvasStore";

export default function CollaborationCursors() {
  const collaborators = useCanvasStore((s) => s.collaborators);

  return (
    <g>
      {collaborators.map((collab) => {
        if (!collab.cursor_position) return null;

        const { x, y } = collab.cursor_position;

        return (
          <g key={collab.user_id} style={{ pointerEvents: "none" }}>
            <path
              d={`M ${x} ${y} L ${x} ${y + 16} L ${x + 5} ${y + 11} L ${x + 10} ${y + 18} L ${x + 13} ${y + 17} L ${x + 7} ${y + 9} L ${x + 12} ${y + 9} Z`}
              fill={collab.avatar_color}
              stroke="white"
              strokeWidth={1.5}
            />
            <g transform={`translate(${x + 16}, ${y - 4})`}>
              <rect
                x={0}
                y={0}
                width={collab.username.length * 8 + 16}
                height={20}
                rx={4}
                fill={collab.avatar_color}
              />
              <text
                x={8}
                y={14}
                fill="white"
                fontSize="11"
                fontWeight="500"
                style={{ userSelect: "none" }}
              >
                {collab.username}
              </text>
            </g>
            {collab.selected_element && (
              <text
                x={x + 16}
                y={y + 32}
                fill={collab.avatar_color}
                fontSize="10"
                style={{ userSelect: "none" }}
              >
                正在编辑...
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
