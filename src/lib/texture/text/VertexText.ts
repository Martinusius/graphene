import { BufferGeometry, OrthographicCamera, Points, ShaderMaterial } from "three";
import type { NewCompute } from "../compute/Compute";
import type { ComputeBuffer } from "../compute/ComputeBuffer";
import { Font } from "./Font";
import type { Three } from "../Three";
import { textFragment, textVertex } from "./vertexText.glsl";
import { floatBitsToUint, uintBitsToFloat } from "../reinterpret";
import type { Vertices } from "../Vertices";

export class VertexText {
  private points: Points<BufferGeometry, ShaderMaterial>;


  constructor(three: Three, private compute: NewCompute, private vertices: Vertices, private vertexData: ComputeBuffer, private edgeData: ComputeBuffer, private font: Font) {
    this.letterBuffer = this.compute.createBuffer(1024);

    const geometry = new BufferGeometry();
    geometry.setDrawRange(0, 0);

    const material = new ShaderMaterial({
      uniforms: {
        vertexData: { value: null },
        letters: { value: null },
        fontAtlasCoords: { value: null },
        fontAtlas: { value: this.font.atlas },
        size: { value: 40 },
        resolution: {
          value: three.resolution,
        },
        vertexDataSize: { value: vertexData.width },
        lettersSize: { value: 2048 },
        fontAtlasCoordsSize: { value: 2048 },
        alphabetSize: { value: 64 },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: textVertex,
      fragmentShader: textFragment,
    });

    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;


    this.points.onBeforeRender = (_, __, camera: OrthographicCamera) => {
      this.points.material.uniforms.size.value = camera.zoom * 400;

      this.points.material.uniforms.vertexDataSize.value = vertexData.width;

      this.points.material.uniforms.vertexData.value =
        vertexData.readable().texture;

      this.points.material.uniforms.fontAtlasCoords.value = this.font.atlasCoords.readable().texture;

      this.points.material.uniforms.resolution.value.copy(three.resolution);
    };

    this.points.onAfterRender = () => {
      this.points.material.uniforms.vertexData.value = null;
    };

    three.scene.add(this.points);
  }

  private letterBuffer: ComputeBuffer;


  async showVertices(auxBuffer: ComputeBuffer = this.vertexData, stride = 4, index = 3) {
    const data = await auxBuffer.read();
    const texts = [];

    let totalChars = 0;

    for (let i = index; i < stride * this.vertices.count; i += stride) {
      const text = String(Math.round(floatBitsToUint(data[i]) * 100) / 100);

      texts.push(text);
      totalChars += text.length;
    }

    this.letterBuffer.resizeErase(totalChars);

    const letterData = new Float32Array(totalChars * 4);
    const offsetData = new Float32Array(totalChars * 4);

    let j = 0;
    let v = 0;
    for (const text of texts) {
      let totalWidth = 0;
      let totalWidthPct = 0;

      for (let i = 0; i < text.length; i++) {
        const letter = this.font.maxFont[text[i]] ?? this.font.maxFont["?"];

        totalWidth += letter.width;
        totalWidthPct += letter.width / letter.height;
      }

      const scale = Math.min(1, 1 / totalWidthPct) * 0.6;


      let totalOffset = 0;
      for (let i = 0; i < text.length; i++) {
        const letter = this.font.maxFont[text[i]] ?? this.font.maxFont["?"];


        letterData[j + 0] = uintBitsToFloat(v);
        letterData[j + 1] = uintBitsToFloat(this.font.letterIndices[text[i]]);
        letterData[j + 2] = scale;
        letterData[j + 3] = (totalOffset - totalWidth / 2 + letter.width / 2) / letter.height;

        totalOffset += letter.width;

        j += 4;
      }

      v++;
    }

    this.points.geometry.setDrawRange(0, totalChars);

    console.log(totalChars);

    await this.letterBuffer.write(letterData);

    this.points.material.uniforms.letters.value = this.letterBuffer.readable().texture;

    this.points.material.uniforms.lettersSize.value = this.letterBuffer.width;
    this.points.material.uniforms.fontAtlasCoordsSize.value = this.font.atlasCoords.width;
    this.points.material.uniforms.alphabetSize.value = Font.alphabet.length;

    console.log('atlas size', this.font.atlasCoords.width);


  }
}