export const INTEGER_NULL = 1 << 30 + 1;
export const INTEGER_POSITIVE_INIFNITY = 1 << 30;
export const INTEGER_NEGATIVE_INIFNITY = -1 << 30;

export const VERTEX_NULL = -1;
export const EDGE_NULL = -1;

export const typeStyles = {
  integer: {
    label: "Integer",
    color: "text-indigo-700",
    special: {
      [INTEGER_NULL]: "Null",
      [INTEGER_POSITIVE_INIFNITY]: "Infinity",
      [INTEGER_NEGATIVE_INIFNITY]: "-Infinity"
    }
  },
  vertex: {
    label: "@Vertex",
    color: "text-green-700",
    special: {
      [VERTEX_NULL]: "Null",
    }
  },
  edge: {
    label: "@Edge",
    color: "text-green-700",
    special: {
      [EDGE_NULL]: "Null",
    }
  },
};


