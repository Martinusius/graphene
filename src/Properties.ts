export const INTEGER_NULL = (1 << 30) + 1;
export const INTEGER_POSITIVE_INIFNITY = 1 << 30;
export const INTEGER_NEGATIVE_INIFNITY = -1 << 30;

// export const VERTEX_NULL = 4227858431;
// export const EDGE_NULL = 4227858431;
export const VERTEX_NULL = (1 << 30) + 1;
export const EDGE_NULL = (1 << 30) + 1;

export const NULL = (1 << 30) + 1;

export const propertyTypes = {
  integer: {
    label: "Integer",
    color: "text-indigo-700",
    special: {
      [INTEGER_NULL]: "Null",
      [INTEGER_POSITIVE_INIFNITY]: "Infinity",
      [INTEGER_NEGATIVE_INIFNITY]: "-Infinity"
    },
    null: INTEGER_NULL,
  },
  vertex: {
    label: "@Vertex",
    color: "text-green-700",
    special: {
      [VERTEX_NULL]: "Null",
    },
    null: VERTEX_NULL,
  },
  edge: {
    label: "@Edge",
    color: "text-green-700",
    special: {
      [EDGE_NULL]: "Null",
    },
    null: EDGE_NULL,
  },
};


