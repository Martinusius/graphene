import { shader } from "./shader";

export const selectInfo = shader(`
uniform buffer dataBuffer;
uniform bool isVertices; // otherwise edges

out vec4 color;

void main() {
  vec4 data = ReadBuffer(dataBuffer, instanceId);

  uint value = floatBitsToUint(data.z);

  uint selected = value & 1u;

  if(selected != 1u) {
    Discard();
    return;
  }

  vec4 result = vec4(0);

  result.x = float(selected); // count selected
  result.y = uintBitsToFloat(uint(instanceId)); // id of selected (gets corrupted if multiple are selected)

  if(isVertices) {
    result.zw = data.xy; // for average position
  }
  
  WriteOutput(0, result);
}`);
