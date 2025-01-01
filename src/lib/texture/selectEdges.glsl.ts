import { shader } from "./shader";

export const selectEdges = shader(`
uniform sampler2D vertexData;
uniform sampler2D edgeData;

uniform uvec2 vertexDataSize;

uniform vec2 min;
uniform vec2 max;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;

uniform vec2 screenResolution;
uniform float size;

uniform bool select;
uniform bool preview;

out vec4 color;

bool lineSegmentIntersection(vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  float denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  float ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  float ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
  return ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0;
}

void main() {
  mat4 m = projectionMatrix * _viewMatrix;
  
  vec2 uv = gl_FragCoord.xy / vec2(outputSize);

  vec4 edge = texture(edgeData, uv);

  uvec2 vertexIndices = uvec2(floatBitsToUint(edge.x), floatBitsToUint(edge.y));

  bool vuArrow = bool(vertexIndices.x & 1u);
  bool uvArrow = bool(vertexIndices.y & 1u);

  vec2 firstVertex = texture(vertexData, indexUv(vertexIndices.x >> 1, vertexDataSize)).xy;
  vec2 secondVertex = texture(vertexData, indexUv(vertexIndices.y >> 1, vertexDataSize)).xy;

  vec2 firstVertexScreen = (m * vec4(firstVertex, 0, 1)).xy;
  vec2 secondVertexScreen = (m * vec4(secondVertex, 0, 1)).xy;

  bool intersectsLeft = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, min, vec2(min.x, max.y));
  bool intersectsRight = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, max, vec2(max.x, min.y));
  bool intersectsTop = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, min, vec2(max.x, min.y));
  bool intersectsBottom = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, max, vec2(min.x, max.y));
  
  bool intersects = intersectsLeft || intersectsRight || intersectsTop || intersectsBottom;
  bool inside = 
    firstVertexScreen.x >= min.x && firstVertexScreen.x <= max.x && 
    firstVertexScreen.y >= min.y && firstVertexScreen.y <= max.y &&
    secondVertexScreen.x >= min.x && secondVertexScreen.x <= max.x && 
    secondVertexScreen.y >= min.y && secondVertexScreen.y <= max.y;

  uint previous = floatBitsToUint(edge.z);
  uint new = previous & ~0b11u;

  if(intersects || inside) {
    new |= uint(select);
    new |= preview ? (previous & 0b10u) : uint(select) << 1;
  } else {
    new |= previous & 0b10u;
    new |= (previous & 0b10u) >> 1;
  }

  color = vec4(edge.xy, uintBitsToFloat(new), 0);
}`);
