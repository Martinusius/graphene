import type { DirectedGraphGenerator } from "$lib/texture/DirectedGraphGenerator";
import type { GraphGenerator } from "$lib/texture/GraphGenerator";
import type { AuxiliaryProperty, AuxiliaryType } from "$lib/texture/interface/Auxiliary";

export type Operations = {
  delete(): void;
  merge(): void;
  cliqueify(): void;
  subgraph(): void;
  
  undo(): void;
  redo(): void;

  copy(): void;
  paste(): void;
  cut(): void;
};

export type Flags = {
  isUndoable: boolean;
  isRedoable: boolean;
};

export type PropertyConfig = {
  properties: Record<string, AuxiliaryProperty>,
  // displayProperty: string;

  createProperty(name: string, type: AuxiliaryType): AuxiliaryProperty;
  deleteProperty(name: string): void;
  renameProperty(from: string, to: string): void;
  getProperty(name: string, i: number): number;
  setProperty(name: string, i: number, value: number): void;
};

export type EditorInterface = {
  operations: Operations;
  flags: Flags;

  areForcesEnabled: boolean;
  isGridShown: boolean;

  vertexProperties: PropertyConfig;
  vertexDisplayProperty: string;
  
  edgeProperties: PropertyConfig;
  edgeDisplayProperty: string;

  reactive(callback: () => void): void;
  unreactive(callback: () => void): void;

  transaction(callback: () => void): Promise<void>;

  generator: GraphGenerator | DirectedGraphGenerator;
};

export enum DragState {
  None,
  Preparing,
  Ready,
  Dragging
};


