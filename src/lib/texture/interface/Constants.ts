export const VERTEX_SIZE = 16;
export const EDGE_SIZE = 16;

export enum VertexProperty {
  POSITION_X = 0,
  POSITION_Y = 4,
  SELECTION_FLAGS = 8,
  ID = 12
};

export enum EdgeProperty {
  U_INDEX = 0,
  V_INDEX = 4,
  SELECTION_FLAGS = 8,
  ID = 12
};