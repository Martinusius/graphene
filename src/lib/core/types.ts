import type { AuxiliaryType } from "./interface/Auxiliary";

export type HoverState = {
  type: "vertex" | "edge";
  id: number;
};

export type GrapheneJSON = {
  isDirected: boolean;
  vertexProperties: { name: string; type: AuxiliaryType }[];
  edgeProperties: { name: string; type: AuxiliaryType }[];
  vertexData: {
    x: number;
    y: number;
    id: number;
    properties: { [key: string]: number };
  }[];
  edgeData: {
    u: number;
    v: number;
    properties: { [key: string]: number };
  }[];
};