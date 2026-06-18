import type { ElementType } from "@/types";

export type PartCategory =
  | "transmission"
  | "support"
  | "energy"
  | "hydraulic"
  | "structure"
  | "annotation";

export interface PartMeta {
  type: ElementType;
  label: string;
  category: PartCategory;
  categoryLabel: string;
  aliases: string[];
}

export const partMeta: Record<ElementType, PartMeta> = {
  gear: {
    type: "gear",
    label: "齿轮",
    category: "transmission",
    categoryLabel: "传动",
    aliases: ["齿轮", "传动", "转动", "牙轮", "齿轮传动", "大齿轮", "小齿轮"],
  },
  lever: {
    type: "lever",
    label: "杠杆",
    category: "transmission",
    categoryLabel: "传动",
    aliases: ["杠杆", "撬杆", "传力", "力臂", "传动", "连杆", "杠杆机构"],
  },
  pulley: {
    type: "pulley",
    label: "滑轮",
    category: "transmission",
    categoryLabel: "传动",
    aliases: ["滑轮", "滑车", "传动", "提升", "滑轮组", "吊轮"],
  },
  wheel: {
    type: "wheel",
    label: "轮轴",
    category: "transmission",
    categoryLabel: "传动",
    aliases: ["轮轴", "车轮", "轮子", "传动", "传动轴", "转轴"],
  },
  cam: {
    type: "cam",
    label: "凸轮",
    category: "transmission",
    categoryLabel: "传动",
    aliases: ["凸轮", "偏心轮", "传动", "机构", "凸轮机构"],
  },
  bearing: {
    type: "bearing",
    label: "轴承",
    category: "support",
    categoryLabel: "支撑",
    aliases: ["轴承", "支撑", "轴", "传动", "支座", "轴承座"],
  },
  spring: {
    type: "spring",
    label: "弹簧",
    category: "energy",
    categoryLabel: "储能",
    aliases: ["弹簧", "储能", "弹性", "复位", "回位", "蓄能"],
  },
  piston: {
    type: "piston",
    label: "活塞",
    category: "hydraulic",
    categoryLabel: "液压气动",
    aliases: ["活塞", "液压", "气动", "推杆", "气缸", "液压缸"],
  },
  box: {
    type: "box",
    label: "箱体",
    category: "structure",
    categoryLabel: "结构",
    aliases: ["箱体", "外壳", "容器", "结构", "机箱", "外壳"],
  },
  arrow: {
    type: "arrow",
    label: "箭头",
    category: "annotation",
    categoryLabel: "标注",
    aliases: ["箭头", "方向", "指示", "标注", "运动方向"],
  },
};

export const partMetaList: PartMeta[] = Object.values(partMeta);

export interface Association {
  type: ElementType;
  weight: number;
  reason: string;
}

export const builtinAssociations: Record<ElementType, Association[]> = {
  gear: [
    { type: "gear", weight: 0.92, reason: "常用于配对传动" },
    { type: "bearing", weight: 0.86, reason: "支撑齿轮轴" },
    { type: "lever", weight: 0.72, reason: "齿轮连杆机构" },
    { type: "wheel", weight: 0.66, reason: "传动轴连接" },
    { type: "cam", weight: 0.6, reason: "凸轮齿轮组" },
    { type: "pulley", weight: 0.55, reason: "带传动组合" },
  ],
  lever: [
    { type: "gear", weight: 0.82, reason: "齿轮杠杆机构" },
    { type: "spring", weight: 0.76, reason: "回位弹簧" },
    { type: "bearing", weight: 0.72, reason: "杠杆支点" },
    { type: "pulley", weight: 0.62, reason: "滑轮杠杆" },
    { type: "cam", weight: 0.56, reason: "凸轮从动件" },
  ],
  pulley: [
    { type: "lever", weight: 0.82, reason: "滑轮杠杆" },
    { type: "spring", weight: 0.72, reason: "复位配重" },
    { type: "bearing", weight: 0.66, reason: "滑轮轴支撑" },
    { type: "gear", weight: 0.52, reason: "齿轮滑轮组" },
  ],
  wheel: [
    { type: "bearing", weight: 0.9, reason: "轮轴轴承" },
    { type: "gear", weight: 0.7, reason: "齿轮传动轴" },
    { type: "lever", weight: 0.52, reason: "连杆传动" },
    { type: "cam", weight: 0.46, reason: "凸轮轴" },
  ],
  cam: [
    { type: "gear", weight: 0.8, reason: "凸轮齿轮组" },
    { type: "lever", weight: 0.76, reason: "凸轮从动杆" },
    { type: "spring", weight: 0.72, reason: "回位弹簧" },
    { type: "bearing", weight: 0.6, reason: "凸轮轴支撑" },
  ],
  bearing: [
    { type: "gear", weight: 0.86, reason: "支撑齿轮轴" },
    { type: "wheel", weight: 0.8, reason: "支撑轮轴" },
    { type: "pulley", weight: 0.62, reason: "支撑滑轮轴" },
    { type: "lever", weight: 0.56, reason: "杠杆支点" },
    { type: "cam", weight: 0.5, reason: "凸轮轴支撑" },
    { type: "piston", weight: 0.46, reason: "活塞导向" },
  ],
  spring: [
    { type: "piston", weight: 0.86, reason: "活塞回位" },
    { type: "lever", weight: 0.76, reason: "杠杆复位" },
    { type: "box", weight: 0.6, reason: "弹簧腔体" },
    { type: "cam", weight: 0.56, reason: "凸轮回位" },
  ],
  piston: [
    { type: "spring", weight: 0.86, reason: "活塞回位" },
    { type: "box", weight: 0.76, reason: "气缸缸体" },
    { type: "bearing", weight: 0.58, reason: "活塞导向" },
    { type: "gear", weight: 0.5, reason: "齿条活塞" },
  ],
  box: [
    { type: "gear", weight: 0.76, reason: "内装齿轮组" },
    { type: "bearing", weight: 0.7, reason: "轴承座" },
    { type: "piston", weight: 0.66, reason: "气缸缸体" },
    { type: "spring", weight: 0.52, reason: "弹簧腔" },
  ],
  arrow: [
    { type: "gear", weight: 0.4, reason: "标注齿轮转向" },
    { type: "lever", weight: 0.38, reason: "标注杠杆方向" },
  ],
};

export const categoryList: { id: PartCategory; label: string }[] = [
  { id: "transmission", label: "传动" },
  { id: "support", label: "支撑" },
  { id: "energy", label: "储能" },
  { id: "hydraulic", label: "液压气动" },
  { id: "structure", label: "结构" },
  { id: "annotation", label: "标注" },
];

export function getCategoryLabel(category: PartCategory): string {
  const found = categoryList.find((c) => c.id === category);
  return found ? found.label : category;
}
