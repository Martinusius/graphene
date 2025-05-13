import { CanvasTexture, LinearFilter } from "three";
import type { Compute } from "../compute/Compute";
import type { ComputeBuffer } from "../compute/ComputeBuffer";
import { uintBitsToFloat } from "../reinterpret";

const DEBUG_SHOW_FONT_ATLAS = false;
const DEBUG_RED_RECTANGLE = false;

export type Letter = { x: number, y: number, width: number, height: number };

export class Font {
  public static alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.?+-";
  public static letterIndices: Record<string, number> = Object.fromEntries(Font.alphabet.split("").map((letter, i) => [letter, i]));

  public static glslChar(character: string) {
    return this.letterIndices[character];
  }

  public static glslString(string: string) {
    string = string.split("").reverse().join("");
    
    const array = new Array(Math.ceil(string.length / 4));
    for (let i = 0; i < string.length; i++) {
      const char = Font.letterIndices[string[i]];
      array[Math.floor(i / 4)] |= char << (8 * (i % 4));
    }

    return `vec3(${uintBitsToFloat(array[0] ?? 0)}, ${uintBitsToFloat(array[1] ?? 0)}, ${string.length})`;
  }

  public atlas: CanvasTexture;
  public maxFont: Record<string, Letter> = {};

  public atlasCoords: ComputeBuffer;

  public ready: Promise<void>;

  constructor(compute: Compute, font: string = "Arial") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    canvas.width = 2048;
    canvas.height = 2048;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    const offset = 5;

    let x = offset, y = offset;

    const fontSizes = [8, 10, 13, 16, 21, 27, 34, 43, 55, 70, 89, 113, 144];

    this.atlasCoords = compute.createBuffer(Font.alphabet.length * fontSizes.length);

    const data = new Float32Array(Font.alphabet.length * fontSizes.length * 4);

    let j = 0;

    for (const fontSize of fontSizes) {
      const letters: Record<string, { x: number, y: number, width: number, height: number }> = {};

      ctx.font = `${fontSize}px ${font}`;
      ctx.fillStyle = "black";

      for (let i = 0; i < Font.alphabet.length; i++) {
        const letter = Font.alphabet[i];
        const metrics = ctx.measureText(letter);
        const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        const width = metrics.width;

        if (x + width > canvas.width - offset) {
          x = offset;
          y += height + offset;
        }

        if(DEBUG_RED_RECTANGLE) {
          // draw red rectangle around characters
          ctx.strokeStyle = "red";
          ctx.strokeRect(x, y, width, height);
        }

       

        ctx.fillStyle = "black";
        ctx.fillText(letter, x, y + height - metrics.fontBoundingBoxDescent);

        letters[letter] = { x, y, width, height };

        data[j + 0] = x / 2048;
        data[j + 1] = y / 2048;
        data[j + 2] = width / 2048;
        data[j + 3] = height / 2048;

        x += width + offset;

        j += 4;
      }

      this.maxFont = letters;
    }



    this.atlas = new CanvasTexture(canvas);

    this.atlas.magFilter = this.atlas.minFilter = LinearFilter;

    this.ready = this.atlasCoords.write(data);

    if(DEBUG_SHOW_FONT_ATLAS) {
      // display the canvas in the body
      canvas.classList.add('canvas');
      document.body.appendChild(canvas);
    }
  }
}
