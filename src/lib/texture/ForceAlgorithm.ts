import type { ComputeProgram } from "./compute/ComputeProgram";

export abstract class ForceAlgorithm {
  public abstract repulsionFunction(): string;
  public abstract attractionFunction(): string;
  public abstract uniforms(): any;

  public setUniforms(program: ComputeProgram) {
    for (const [name, value] of Object.entries(this.uniforms())) {
      program.setUniform(name, value);
    }
  }
}

export class EadesAlgorithm extends ForceAlgorithm {
  public repulsionStrength = 2000;

  public repulsionFunction() {
    return `
      uniform float repulsionStrength;

      vec2 repulse(vec2 a, vec2 b) {
        vec2 direction = normalize(a - b);
        float distanceSquared = dot(a - b, a - b);
        return direction * repulsionStrength / max(10.0, distanceSquared);
      }
    `;
  }

  public springLength = 25;
  public springStrength = 50;

  public attractionFunction() {
    return `
      uniform float springLength;
      uniform float springStrength;

      vec2 attract(vec2 a, vec2 b) {
        vec2 direction = normalize(b - a);
        float distance = length(a - b);
        return direction * springStrength * log(max(1.0, distance) / springLength);
      }
    `;
  }

  public uniforms() {
    return {
      repulsionStrength: this.repulsionStrength,
      springLength: this.springLength,
      springStrength: this.springStrength,
    };
  }
}

export class FruchtermanReingoldAlgorithm extends ForceAlgorithm {
  public springLength = 25;
  public factor = 0.2;

  public repulsionFunction() {
    return `
      uniform float springLength;
      uniform float factor;

      vec2 repulse(vec2 a, vec2 b) {
        vec2 direction = normalize(a - b);
        float distance = length(a - b) * factor;
        return direction * springLength * springLength / max(1.0, distance);
      }
    `;
  }


  public attractionFunction() {
    return `
      uniform float springLength;
      uniform float factor;

      vec2 attract(vec2 a, vec2 b) {
        vec2 direction = normalize(b - a);
        float distanceSquared = dot(a - b, a - b) * factor * factor;
        return direction * distanceSquared / springLength;
      }
    `;
  }

  public uniforms() {
    return {
      springLength: this.springLength,
      factor: this.factor,
    };
  }
}