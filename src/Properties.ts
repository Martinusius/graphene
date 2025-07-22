export const INTEGER_NULL = (1 << 30) + 1;
export const INTEGER_POSITIVE_INIFNITY = 1 << 30;
export const INTEGER_NEGATIVE_INIFNITY = -1 << 30;

export const VERTEX_NULL = (1 << 30) + 1;
export const EDGE_NULL = (1 << 30) + 1;

export const NULL = (1 << 30) + 1;

export const propertyTypes = {
  integer: {
    label: "Integer",
    color: "text-indigo-700",
    special: {
      [INTEGER_NULL]: { label: "Null", json: null },
      [INTEGER_POSITIVE_INIFNITY]: { label: "Infinity", json: Infinity },
      [INTEGER_NEGATIVE_INIFNITY]: { label: "-Infinity", json: -Infinity }
    },
    null: INTEGER_NULL,
  },
  vertex: {
    label: "@Vertex",
    color: "text-green-700",
    special: {
      [VERTEX_NULL]: { label: "Null", json: null },
    },
    null: VERTEX_NULL,
  },
  edge: {
    label: "@Edge",
    color: "text-green-700",
    special: {
      [EDGE_NULL]: { label: "Null", json: null },
    },
    null: EDGE_NULL,
  },
};

export function valueToJSON(value: number, type: keyof typeof propertyTypes) {
  console.log(`Converting value ${value} of type ${type} to JSON.`, propertyTypes[type].special[value]);

  if (propertyTypes[type].special[value] !== undefined)
    return propertyTypes[type].special[value].json;
  return value;
}

export function valueFromJSON(value: any, type: keyof typeof propertyTypes) {
  if (typeof value === "number") return value;

  const found = Object.entries(propertyTypes[type].special).find(([_, special]) => {
    if (special.json === value) return true;
  });

  if (found) return Number(found[0]);

  console.warn(`Value ${value} of type ${type} not recognized, returning Null.`);
  return propertyTypes[type].null;
}


