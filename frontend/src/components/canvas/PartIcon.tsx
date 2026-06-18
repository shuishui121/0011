import type { CanvasElement, ElementType } from "@/types";

interface PartIconProps {
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  selected?: boolean;
}

export default function PartIcon({
  type,
  x,
  y,
  width,
  height,
  color = "#f59e0b",
  selected = false,
}: PartIconProps) {
  const strokeWidth = selected ? 3 : 2;
  const strokeColor = selected ? "#3b82f6" : color;
  const fillColor = color;
  const fillOpacity = 0.2;

  const renderPart = () => {
    switch (type) {
      case "gear":
        return <GearIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "lever":
        return <LeverIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "pulley":
        return <PulleyIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "spring":
        return <SpringIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "piston":
        return <PistonIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "wheel":
        return <WheelIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "box":
        return <BoxIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "arrow":
        return <ArrowIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "bearing":
        return <BearingIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case "cam":
        return <CamIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
      default:
        return <BoxIcon width={width} height={height} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <g transform={`translate(${x}, ${y})`}>
      {renderPart()}
    </g>
  );
}

function GearIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) / 2 - 2;
  const innerR = outerR * 0.6;
  const toothCount = 12;
  const toothDepth = outerR * 0.15;

  let path = "";
  for (let i = 0; i < toothCount; i++) {
    const angle1 = (i / toothCount) * Math.PI * 2 - Math.PI / 2;
    const angle2 = ((i + 0.5) / toothCount) * Math.PI * 2 - Math.PI / 2;
    const angle3 = ((i + 1) / toothCount) * Math.PI * 2 - Math.PI / 2;

    const r1 = outerR - toothDepth;
    const r2 = outerR;
    const r3 = outerR - toothDepth;

    const x1 = cx + Math.cos(angle1) * r1;
    const y1 = cy + Math.sin(angle1) * r1;
    const x2 = cx + Math.cos(angle2) * r2;
    const y2 = cy + Math.sin(angle2) * r2;
    const x3 = cx + Math.cos(angle3) * r3;
    const y3 = cy + Math.sin(angle3) * r3;

    if (i === 0) {
      path += `M ${x1} ${y1} `;
    }
    path += `L ${x2} ${y2} L ${x3} ${y3} `;
  }
  path += "Z";

  return (
    <g>
      <path d={path} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={innerR * 0.5} fill="white" stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
}

function LeverIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const cy = height / 2;
  const barWidth = width * 0.8;
  const barHeight = height * 0.15;
  const pivotR = Math.min(width, height) * 0.12;

  return (
    <g>
      <rect
        x={cx - barWidth / 2}
        y={cy - barHeight / 2}
        width={barWidth}
        height={barHeight}
        rx={barHeight / 2}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle cx={cx} cy={cy} r={pivotR} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={pivotR * 0.4} fill={stroke} />
    </g>
  );
}

function PulleyIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) / 2 - 2;
  const innerR = outerR * 0.5;

  return (
    <g>
      <circle cx={cx} cy={cy} r={outerR} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={innerR} fill="white" stroke={stroke} strokeWidth={strokeWidth} />
      <line
        x1={cx - outerR * 0.7}
        y1={cy - height * 0.4}
        x2={cx + outerR * 0.7}
        y2={cy - height * 0.4}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <line
        x1={cx - outerR * 0.7}
        y1={cy + height * 0.4}
        x2={cx + outerR * 0.7}
        y2={cy + height * 0.4}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function SpringIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const coils = 6;
  const coilWidth = width / coils;
  const startY = height * 0.2;
  const endY = height * 0.8;

  let path = `M ${width * 0.2} ${startY} `;
  for (let i = 0; i < coils; i++) {
    const x1 = width * 0.2 + i * coilWidth;
    const x2 = x1 + coilWidth * 0.5;
    const x3 = x1 + coilWidth;
    const y1 = startY + (i / coils) * (endY - startY);
    const y2 = startY + ((i + 0.5) / coils) * (endY - startY);
    const y3 = startY + ((i + 1) / coils) * (endY - startY);

    path += `Q ${x2} ${y1} ${x2} ${y2} Q ${x2} ${y3} ${x3} ${y2} `;
  }
  path += `L ${width * 0.8} ${endY}`;

  return (
    <g>
      <line x1={width * 0.2} y1={startY} x2={width * 0.2} y2={startY - height * 0.1} stroke={stroke} strokeWidth={strokeWidth} />
      <path d={path} fill={fill || "none"} fillOpacity={fill ? fillOpacity : 0} stroke={stroke} strokeWidth={strokeWidth} />
      <line x1={width * 0.8} y1={endY} x2={width * 0.8} y2={endY + height * 0.1} stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
}

function PistonIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const pistonWidth = width * 0.7;
  const pistonHeight = height * 0.35;
  const rodWidth = width * 0.15;
  const rodHeight = height * 0.4;

  return (
    <g>
      <rect
        x={cx - pistonWidth / 2}
        y={height * 0.1}
        width={pistonWidth}
        height={pistonHeight}
        rx={4}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <rect
        x={cx - rodWidth / 2}
        y={height * 0.1 + pistonHeight}
        width={rodWidth}
        height={rodHeight}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <line
        x1={cx - pistonWidth / 2 + 5}
        y1={height * 0.1 + pistonHeight * 0.3}
        x2={cx + pistonWidth / 2 - 5}
        y2={height * 0.1 + pistonHeight * 0.3}
        stroke={stroke}
        strokeWidth={1}
      />
      <line
        x1={cx - pistonWidth / 2 + 5}
        y1={height * 0.1 + pistonHeight * 0.6}
        x2={cx + pistonWidth / 2 - 5}
        y2={height * 0.1 + pistonHeight * 0.6}
        stroke={stroke}
        strokeWidth={1}
      />
    </g>
  );
}

function WheelIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) / 2 - 2;
  const innerR = outerR * 0.25;
  const spokeCount = 8;

  const spokes = [];
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const x2 = cx + Math.cos(angle) * outerR * 0.9;
    const y2 = cy + Math.sin(angle) * outerR * 0.9;
    spokes.push(
      <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} />
    );
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={outerR} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} />
      {spokes}
      <circle cx={cx} cy={cy} r={innerR} fill="white" stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
}

function BoxIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  return (
    <rect
      x={2}
      y={2}
      width={width - 4}
      height={height - 4}
      rx={4}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function ArrowIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const arrowHeadSize = Math.min(width, height) * 0.4;
  const shaftWidth = width * 0.3;

  return (
    <g>
      <polygon
        points={`
          ${width - 4},${height / 2}
          ${width - arrowHeadSize},${height * 0.2}
          ${width - arrowHeadSize},${height * 0.4}
          4,${height * 0.4}
          4,${height * 0.6}
          ${width - arrowHeadSize},${height * 0.6}
          ${width - arrowHeadSize},${height * 0.8}
        `}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  );
}

function BearingIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) / 2 - 2;
  const innerR = outerR * 0.5;
  const ballCount = 8;
  const ballR = outerR * 0.12;

  const balls = [];
  for (let i = 0; i < ballCount; i++) {
    const angle = (i / ballCount) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * (outerR * 0.72);
    const by = cy + Math.sin(angle) * (outerR * 0.72);
    balls.push(<circle key={i} cx={bx} cy={by} r={ballR} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth * 0.7} />);
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={outerR} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth * 1.5} />
      <circle cx={cx} cy={cy} r={innerR} fill="white" stroke={stroke} strokeWidth={strokeWidth * 1.5} />
      {balls}
    </g>
  );
}

function CamIcon({ width, height, fill, fillOpacity, stroke, strokeWidth }: any) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - 4;
  const ry = height * 0.35;

  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={cx * 0.5} cy={cy} r={Math.min(width, height) * 0.12} fill="white" stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
}

export const partTypes: { type: ElementType; label: string; description: string }[] = [
  { type: "gear", label: "齿轮", description: "传动齿轮" },
  { type: "lever", label: "杠杆", description: "杠杆机构" },
  { type: "pulley", label: "滑轮", description: "滑轮组" },
  { type: "spring", label: "弹簧", description: "储能弹簧" },
  { type: "piston", label: "活塞", description: "气动/液压活塞" },
  { type: "wheel", label: "轮轴", description: "车轮/轮轴" },
  { type: "box", label: "箱体", description: "箱体/外壳" },
  { type: "arrow", label: "箭头", description: "运动方向" },
  { type: "bearing", label: "轴承", description: "轴承支撑" },
  { type: "cam", label: "凸轮", description: "凸轮机构" },
];
