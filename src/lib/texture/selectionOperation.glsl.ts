import { shader } from "./shader";

export const selectionOperation = shader(`
uniform buffer data;
uniform bool isVertex;

uniform int operation; // 0: select all, 1: invert selection, 2: only vertices, 3: only edges

void main() {
  vec4 vertex = ReadBuffer(data, instanceId);

  uint valid = floatBitsToUint(vertex.w);
  if(valid == 0u) {
    Discard();
    return;
  }


  uint previous = floatBitsToUint(vertex.z);
  bool selected = bool(previous & 0b1u);

  uint new = previous & ~0b11u;
  
  if(operation == 0) {
    new |= 0b11u;
  } else if(operation == 1) {
    new |= selected ? 0u : 0b11u;
  } else if(operation == 2) {
    new |= isVertex && selected ? 0b11u : 0u;
  } else if(operation == 3) {
    new |= (!isVertex && selected) ? 0b11u : 0u;
  }

  WriteOutput(instanceId, vec4(vertex.xy, uintBitsToFloat(new), vertex.w));
}`);
