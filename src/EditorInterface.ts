import type { GraphAlgorithms } from "$lib/core/GraphAlgorithms";
import type { GraphExporter } from "$lib/core/GraphExporter";
import type { GraphGenerator } from "$lib/core/GraphGenerator";
import type { GraphImporter } from "$lib/core/GraphImporter";
import type { AuxiliaryProperty, AuxiliaryType } from "$lib/core/interface/Auxiliary";
import type { Graph } from "$lib/core/interface/Graph";
import type { SelectionOperation } from "$lib/core/SelectionOperation";

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

  createProperty(name: string, type: AuxiliaryType): AuxiliaryProperty;
  deleteProperty(name: string): void;
  renameProperty(from: string, to: string): void;
  getProperty(name: string, i: number): number;
  setProperty(name: string, i: number, value: number): void;
  setPropertyType(name: string, type: AuxiliaryType): void;
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

  selectionOperation(operation: SelectionOperation): void;

  generator: GraphGenerator;
  algorithms: GraphAlgorithms;

  exporter: GraphExporter;
  importer: GraphImporter;

  graph: Graph;

  createNew(type: 'undirected' | 'directed'): void;
};

export enum DragState {
  None,
  Preparing,
  Ready,
  Dragging
};


