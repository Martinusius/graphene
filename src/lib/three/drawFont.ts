import { CanvasTexture, LinearFilter, NearestFilter } from "three";

export function drawFont() {
  // render a texture with the alphabet
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");
  canvas.width = 1024;
  canvas.height = 1024;

  const fontSize = 128;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = "black";

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ctx.fillStyle = "black";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;


  const offset = 10;

  let x = offset, y = offset;

  const letters: Record<string, { x: number, y: number, width: number, height: number }> = {};

  for (let i = 0; i < alphabet.length; i++) {

    const letter = alphabet[i];
    const metrics = ctx.measureText(letter);
    const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const width = metrics.width;

    if (x + width > canvas.width - offset) {
      x = 0;
      y += height + offset;
    }

    // draw rectangle
    // ctx.strokeStyle = "red";
    // ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "black";
    ctx.fillText(letter, x, y + height - metrics.fontBoundingBoxDescent);

    letters[letter] = { x, y, width, height };


    x += width + offset;

    // letters.push({ letter, x, y, width, height });

    // metrics.
    //   ctx.fillText(letter, x + i * fontSize, y + fontSize / 2);
    // ctx.strokeText(letter, x + i * fontSize, y + fontSize / 2);
  }

  const texture = new CanvasTexture(canvas);

  texture.magFilter = texture.minFilter = LinearFilter;

  // display the canvas in the body
  // canvas.classList.add('canvas');
  // document.body.appendChild(canvas);

  return { texture, letters };


}