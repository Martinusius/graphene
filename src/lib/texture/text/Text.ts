import {
  BufferGeometry,
  OrthographicCamera,
  Points,
  ShaderMaterial,
  Vector2,
} from "three";
import type { ComputeBuffer } from "../compute/ComputeBuffer";
import { Font } from "./Font";
import type { Three } from "../Three";
import { textFragment, textVertex } from "./text.glsl";
import { textEdgeFragment, textEdgeVertex } from "./textEdge.glsl";

import type { AuxiliaryRef } from "../interface/Auxiliary";

type CountInfo = { count: number };

export class GraphText {
  public static defaultMaxDigits = 8;

  private points: Points<BufferGeometry, ShaderMaterial>;

  public defaultAux: AuxiliaryRef = {
    buffer: () => this.aux.buffer(),
    channel: () => this.aux.channel(),
  };
  
  public aux: AuxiliaryRef;

  constructor(
    three: Three,
    private font: Font,
    private countInfo: CountInfo,
    vertexData: ComputeBuffer,
    edgeData?: ComputeBuffer
  ) {
    this.aux = this.defaultAux = {
      buffer: () => edgeData ?? vertexData,
      channel: () => 3,
    };

    const geometry = new BufferGeometry();

    const material = new ShaderMaterial({
      uniforms: {
        vertexData: { value: null },
        edgeData: { value: null },
        aux: { value: null },
        letters: { value: null },
        fontAtlasCoords: { value: null },
        fontAtlas: { value: this.font.atlas },
        resolution: { value: three.resolution },
        vertexDataSize: { value: vertexData.width },
        edgeDataSize: { value: edgeData?.width ?? 0 },
        auxSize: { value: this.aux.buffer().width },
        fontAtlasCoordsSize: { value: 2048 },
        alphabetSize: { value: Font.alphabet.length },
        auxChannel: { value: this.aux.channel() },
        maxDigits: { value: GraphText.defaultMaxDigits },
        size: { value: 40 },
        overflowString: { value: new Vector2(0) },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: edgeData ? textEdgeVertex : textVertex,
      fragmentShader: edgeData ? textEdgeFragment : textFragment,
    });

    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;

    this.points.onBeforeRender = (_, __, camera: OrthographicCamera) => {
      geometry.setDrawRange(0, this.maxDigits * this.countInfo.count);

      this.points.material.uniforms.size.value =
        camera.zoom * 400 * window.devicePixelRatio;

      this.points.material.uniforms.vertexDataSize.value = vertexData.width;
      this.points.material.uniforms.fontAtlasCoordsSize.value =
        this.font.atlasCoords.width;
      this.points.material.uniforms.auxSize.value = this.aux.buffer().width;
      this.points.material.uniforms.auxChannel.value = this.aux.channel();
      this.points.material.uniforms.edgeDataSize.value = edgeData?.width ?? 0;

      this.points.material.uniforms.vertexData.value =
        vertexData.readable().texture;
      this.points.material.uniforms.aux.value = this.aux
        .buffer()
        .readable().texture;
      this.points.material.uniforms.fontAtlasCoords.value =
        this.font.atlasCoords.readable().texture;
      this.points.material.uniforms.edgeData.value =
        edgeData?.readable().texture;

      this.points.material.uniforms.alphabetSize.value = Font.alphabet.length;
      this.points.material.uniforms.resolution.value.copy(three.resolution);
    };

    this.points.onAfterRender = () => {
      this.points.material.uniforms.vertexData.value = null;
      this.points.material.uniforms.edgeData.value = null;
    };

    three.scene.add(this.points);
  }

  set maxDigits(value: number) {
    this.points.material.uniforms.maxDigits.value = value;
  }

  get maxDigits() {
    return this.points.material.uniforms.maxDigits.value;
  }
}

export class Text {
  public vertices: GraphText;
  public edges: GraphText;

  constructor(
    three: Three,
    font: Font,
    vertices: CountInfo,
    edges: CountInfo,
    vertexData: ComputeBuffer,
    edgeData: ComputeBuffer
  ) {
    this.vertices = new GraphText(three, font, vertices, vertexData);
    this.edges = new GraphText(three, font, edges, vertexData, edgeData);
  }
}
