import { BufferGeometry, Color, CustomBlending, GLSL3, OneFactor, Points, RawShaderMaterial } from "three";
import type { ComputeGlobals } from "./ComputeGlobals";
import { computeFragment, computeVertex, specialComputeFragment, specialComputeVertex } from "../compute.glsl";
import { ComputeBuffer } from "./ComputeBuffer";

const ADDITIVE = {
  blending: CustomBlending,
  blendDst: OneFactor,
  blendSrc: OneFactor
};

export type ComputeProgramOptions = {
  additive?: boolean;
  uniforms?: any;
};

function allowBufferSyntax(code: string) {
  // replace 
  // uniform buffer [name];
  // with
  // uniform sampler2D [name];
  // uniform uint [name]Size;

  return code.replace(/uniform\s+buffer\s+(\w+);/g, (_, name) => `
    uniform sampler2D ${name};
    uniform int ${name}Size;
  `);
}

function allowReadBufferSyntax(code: string) {
  // replace
  // readBuffer(name, index);
  // with
  // texture(name, indexUv(index, name ## Size));

  while (code.includes('ReadBuffer(')) {
    const start = code.indexOf('ReadBuffer(');
    const bracketStart = start + 'readBuffer('.length;

    let i = bracketStart;
    let brackets = 1;

    while (brackets > 0 && i < code.length) {
      if (code[i] === '(') {
        brackets++;
      } else if (code[i] === ')') {
        brackets--;
      }
      i++;
    }

    if (brackets > 0) break;

    const end = i;
    const bracketEnd = end - 1;

    const args = code.slice(bracketStart, bracketEnd);
    const [bufferName, indexExpression] = args.split(',');

    const sizeName = bufferName.trim() + 'Size';

    const replacement = `texture(${bufferName}, indexUv(${indexExpression}, ${sizeName}))`;

    code = code.slice(0, start) + replacement + code.slice(end);
  }

  return code;
}


export class ComputeProgram {
  private readonly points: Points<BufferGeometry, RawShaderMaterial>;

  constructor(
    private readonly globals: ComputeGlobals,
    public readonly shader: string,
    options: ComputeProgramOptions = {}
  ) {
    const material = new RawShaderMaterial({
      uniforms: Object.fromEntries(
        Object.entries(options.uniforms ?? {}).map(([key, value]) => [key, { value }])
      ),
      vertexShader: allowReadBufferSyntax(allowBufferSyntax(specialComputeVertex + shader)),
      fragmentShader: specialComputeFragment,
      glslVersion: GLSL3,
      depthTest: false,
      depthWrite: false,
      ...(options.additive ? ADDITIVE : {})
    });

    const geometry = new BufferGeometry();

    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;

    this.globals.scene.add(this.points);
    this.points.visible = false;
  }

  private computeBufferUniforms: { [key: string]: ComputeBuffer } = {};

  setUniform(key: string, value: any) {
    if (key in this.computeBufferUniforms) {
      this.points.material.uniforms[key].value = null;
      delete this.computeBufferUniforms[key];
    }

    if (value instanceof ComputeBuffer) {
      this.computeBufferUniforms[key] = value;
    } else {
      this._setUniform(key, value);
    }
  }

  private _setUniform(key: string, value: any) {
    if (!this.points.material.uniforms[key]) {
      this.points.material.uniforms[key] = { value };
    } else {
      this.points.material.uniforms[key].value = value;
    }
  }

  execute(output: ComputeBuffer, n?: number) {
    const prevTarget = this.globals.renderer.getRenderTarget();

    n = n ?? output.size;

    for (const [key, value] of Object.entries(this.computeBufferUniforms)) {
      this._setUniform(key, value.readable().texture);
      this._setUniform(
        key + "Size",
        value.width
      );
    }

    this._setUniform(
      "outputSize",
      output.width
    );

    this.points.visible = true;
    this.points.geometry.setDrawRange(0, n);

    const color = new Color();
    this.globals.renderer.getClearColor(color);
    const alpha = this.globals.renderer.getClearAlpha();

    this.globals.renderer.setRenderTarget(output.writable());
    this.globals.renderer.setClearColor(0x000000, 0);
    this.globals.renderer.render(this.globals.scene, this.globals.camera);
    output.swap();

    this.points.visible = false;
    this.globals.renderer.setClearColor(color, alpha);
    this.globals.renderer.setRenderTarget(prevTarget);
  }
}