export const vertexColor = `
attribute mat4 bezierArrows;
attribute float arrowIndex;
attribute vec2 side;
attribute float bezierArrowsIndex;

uniform vec2 resolution;
uniform float tolerance;
uniform float arrowCount;
uniform float distIncrement;

varying vec3 vColor;

vec3 point(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
  float k = 1.0 - t;
  float k2 = k * k;
  float k3 = k2 * k;
  float t2 = t * t;
  float t3 = t2 * t;

  return k3 * p0 + 3.0 * t * k2 * p1 + 3.0 * t2 * k * p2 + t3 * p3;
}

// rotate 2d vector
vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

#define PI 3.1415926535897932384626433832795

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec3 p0 = bezierArrows[0].xyz;
  vec3 p1 = bezierArrows[1].xyz;
  vec3 p2 = bezierArrows[2].xyz;
  vec3 p3 = bezierArrows[3].xyz;

  vec4 s = vec4(1, 0, 0, 1) * projectionMatrix;

  float distFinal = (arrowIndex + 1.0) * distIncrement;
  float dist = distIncrement * 0.5;

  vec3 last = p0;
  float cdist = 0.0;
  float lastDist = 0.0;
  float t = -1.0;

  for(int i = 0; i < 128; i++) {
    vec3 current = point(p0, p1, p2, p3, float(i) / 127.0);

    lastDist = cdist;
    cdist += length(current - last) * s.x;

    last = current;

    while(cdist > dist) {
      float l = mix(float(i - 1) / 127.0, float(i) / 127.0, (dist - lastDist) / (cdist - lastDist));

      vec4 screen = m * vec4(point(p0, p1, p2, p3, l), 1);
      if(abs(screen.x) > screen.w || abs(screen.y) > screen.w) distFinal += distIncrement; 
      dist += distIncrement;
    }

    if(cdist > distFinal) {
      t = mix(float(i - 1) / 127.0, float(i) / 127.0, (distFinal - lastDist) / (cdist - lastDist));
      float tp = mix(float(i - 1) / 127.0, float(i) / 127.0, (distFinal + distIncrement * 0.5 - lastDist) / (cdist - lastDist));
      
      if(t < 0.0 || tp > 1.0) {
        gl_Position = vec4(0, 0, 0, 1);
        return;
      }

      break;
    }
  }

  if(t == -1.0) {
    gl_Position = vec4(0, 0, 0, 1);
    return;
  }

  float k = 1.0 - t;
  float k2 = k * k;
  float k3 = k2 * k;
  float t2 = t * t;
  float t3 = t2 * t;

  vec3 position = k3 * p0 + 3.0 * t * k2 * p1 + 3.0 * t2 * k * p2 + t3 * p3;
  vec3 derivative = -3.0 * k2 * p0 + 3.0 * k2 * p1 - 6.0 * t * k * p1 - 3.0 * t2 * p2 + 6.0 * t * k * p2 + 3.0 * t2 * p3;
  

  vec3 tangent = normalize(derivative);
  vec4 tangentM = m * vec4(position + tangent, 1) - m * vec4(position, 1);

  vec4 normal = vec4(tangent.xy, 0, 1);
  normal.xy = normalize(rotate(vec2(normal.x, normal.y), side.x * PI * 0.25));
  normal.z = 0.0;
  normal *= projectionMatrix;

  vec4 forward = vec4(normalize(tangent.xy), 0, 1);
  forward *= projectionMatrix;

  vec4 result = m * vec4(position, 1);

  normal.xy *= result.w;
  normal.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  forward.xy *= result.w;
  forward.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  if(side.x == 0.0) normal.xy *= 0.0;

  result.xy += normal.xy * bezierArrows[0].w * 8.0;
  
  result.xy += forward.xy * bezierArrows[0].w * 0.5 * side.y;

  vColor = vec3(bezierArrows[1].w, bezierArrows[2].w, bezierArrows[3].w);

  gl_Position = result;
}`;

export const fragmentColor = `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1);
}`;


export const vertexRaycast = `
attribute mat4 bezierArrows;
attribute float arrowIndex;
attribute vec2 side;
attribute float bezierArrowsIndex;

uniform vec2 resolution;
uniform float tolerance;
uniform float arrowCount;
uniform float distIncrement;

varying vec3 vColor;

vec3 point(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
  float k = 1.0 - t;
  float k2 = k * k;
  float k3 = k2 * k;
  float t2 = t * t;
  float t3 = t2 * t;

  return k3 * p0 + 3.0 * t * k2 * p1 + 3.0 * t2 * k * p2 + t3 * p3;
}

// rotate 2d vector
vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

#define PI 3.1415926535897932384626433832795

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec3 p0 = bezierArrows[0].xyz;
  vec3 p1 = bezierArrows[1].xyz;
  vec3 p2 = bezierArrows[2].xyz;
  vec3 p3 = bezierArrows[3].xyz;

  vec4 s = vec4(1, 0, 0, 1) * projectionMatrix;

  float distFinal = (arrowIndex + 1.0) * distIncrement;
  float dist = distIncrement * 0.5;

  vec3 last = p0;
  float cdist = 0.0;
  float lastDist = 0.0;
  float t = -1.0;

  for(int i = 0; i < 128; i++) {
    vec3 current = point(p0, p1, p2, p3, float(i) / 127.0);

    lastDist = cdist;
    cdist += length(current - last) * s.x;

    last = current;

    while(cdist > dist) {
      float l = mix(float(i - 1) / 127.0, float(i) / 127.0, (dist - lastDist) / (cdist - lastDist));

      vec4 screen = m * vec4(point(p0, p1, p2, p3, l), 1);
      if(abs(screen.x) > screen.w || abs(screen.y) > screen.w) distFinal += distIncrement; 
      dist += distIncrement;
    }

    if(cdist > distFinal) {
      t = mix(float(i - 1) / 127.0, float(i) / 127.0, (distFinal - lastDist) / (cdist - lastDist));
      float tp = mix(float(i - 1) / 127.0, float(i) / 127.0, (distFinal + distIncrement * 0.5 - lastDist) / (cdist - lastDist));
      
      if(t < 0.0 || tp > 1.0) {
        gl_Position = vec4(0, 0, 0, 1);
        return;
      }

      break;
    }
  }

  if(t == -1.0) {
    gl_Position = vec4(0, 0, 0, 1);
    return;
  }

  float k = 1.0 - t;
  float k2 = k * k;
  float k3 = k2 * k;
  float t2 = t * t;
  float t3 = t2 * t;

  vec3 position = k3 * p0 + 3.0 * t * k2 * p1 + 3.0 * t2 * k * p2 + t3 * p3;
  vec3 derivative = -3.0 * k2 * p0 + 3.0 * k2 * p1 - 6.0 * t * k * p1 - 3.0 * t2 * p2 + 6.0 * t * k * p2 + 3.0 * t2 * p3;
  

  vec3 tangent = normalize(derivative);
  vec4 tangentM = m * vec4(position + tangent, 1) - m * vec4(position, 1);

  vec4 normal = vec4(tangent.xy, 0, 1);
  normal.xy = normalize(rotate(vec2(normal.x, normal.y), side.x * PI * 0.25));
  normal.z = 0.0;
  normal *= projectionMatrix;

  vec4 forward = vec4(normalize(tangent.xy), 0, 1);
  forward *= projectionMatrix;

  vec4 result = m * vec4(position, 1);

  normal.xy *= result.w;
  normal.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  forward.xy *= result.w;
  forward.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  if(side.x == 0.0) normal.xy *= 0.0;

  result.xy += normal.xy * (bezierArrows[0].w * 8.0 + tolerance);
  
  result.xy += forward.xy * (bezierArrows[0].w * 0.5 + tolerance) * side.y;

  vColor = vec3(4, bezierArrowsIndex + 1.0, t);

  gl_Position = result;
}`;

export const fragmentRaycast = `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1);
}`;