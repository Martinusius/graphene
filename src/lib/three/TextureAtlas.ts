export class TextureAtlas {
  images = {}

  constructor(json, texture) {
    this.texture = texture;

    json.forEach((image) => {
      this.images[image.name] = image;
    });
  }
}