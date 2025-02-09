import { CanvasTexture, LinearFilter, NearestFilter } from "three";
import type { NewCompute } from "../compute/Compute";
import type { ComputeBuffer } from "../compute/ComputeBuffer";

export type Letter = { x: number, y: number, width: number, height: number };

export class Font {
  public static alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.?";

  public atlas: CanvasTexture;
  public maxFont: Record<string, Letter> = {};

  public letterIndices: Record<string, number> = {};
  public atlasCoords: ComputeBuffer;

  constructor(compute: NewCompute) {
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

    Font.alphabet.split("").forEach((letter, i) => {
      this.letterIndices[letter] = i;
    });


    const fontSizes = [8, 10, 13, 16, 21, 27, 34, 43, 55, 70, 89, 113, 144];

    this.atlasCoords = compute.createBuffer(Font.alphabet.length * fontSizes.length);

    const data = new Float32Array(Font.alphabet.length * fontSizes.length * 4);

    let j = 0;

    for (const fontSize of fontSizes) {
      const letters: Record<string, { x: number, y: number, width: number, height: number }> = {};

      ctx.font = `${fontSize}px Arial`;
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

        // draw rectangle
        // ctx.strokeStyle = "red";
        // ctx.strokeRect(x, y, width, height);

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

    this.atlasCoords.write(data);


    this.atlas = new CanvasTexture(canvas);

    this.atlas.magFilter = this.atlas.minFilter = LinearFilter;


    // display the canvas in the body
    // canvas.classList.add('canvas');
    // document.body.appendChild(canvas);
  }
}
