export enum Operation {
  ADD_VERTEX = 0,
  ADD_EDGE = 1,
  DELETE_VERTEX = 2,
  DELETE_EDGE = 3,
  ADD_VERTEX_AUXILIARY = 4,
  ADD_EDGE_AUXILIARY = 5,
  DELETE_VERTEX_AUXILIARY = 5,
  DELETE_EDGE_AUXILIARY = 6,
};

export function isVertexOperation(operation: Operation): boolean {
  return (operation & 1) === 0;
}

export function isEdgeOperation(operation: Operation): boolean {
  return (operation & 1) === 1;
}