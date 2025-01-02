import type { Compute, ComputeProgram, ComputeTexture } from "./Compute";
import { hash } from "./hash.glsl";
import { move } from "./move.glsl";
import { floatBitsToUint, uintBitsToFloat } from "./reinterpret";
import { repulse } from "./repulse.glsl";
import { Float2, Float4 } from "./TextureFormat";

export class Forces {
  private hashTable: ComputeTexture;
  private offsets: ComputeTexture;
  private velocities: ComputeTexture;

  private hashProgram: ComputeProgram;

  private buckets: Float32Array;
  private buckets2: Float32Array;
  private vertices: Float32Array;

  private repulseProgram: ComputeProgram;
  private moveProgram: ComputeProgram;

  public cellSize = 25;
  public repulsionStrength = 1000;

  constructor(compute: Compute, private readonly vertexCount: number, private vertexData: ComputeTexture) {
    this.hashTable = compute.createTextureBuffer(vertexCount / 4);
    this.offsets = compute.createTextureBuffer(vertexCount / 4);
    this.velocities = compute.createTextureBuffer(vertexCount, Float4);

    this.hashProgram = compute.createProgram(hash);

    this.buckets = new Float32Array(this.offsets.width * this.offsets.height * 4);
    this.buckets2 = new Float32Array(this.offsets.width * this.offsets.height * 4);
    this.vertices = new Float32Array(this.offsets.width * this.offsets.height * 4);

    this.repulseProgram = compute.createProgram(repulse);
    this.moveProgram = compute.createProgram(move);
  }

  // hash algo
  // 1. divide the space into grid cells
  // 2. calculate a hash for each cell
  // 3. sort vertices into buckets based on their cell hash
  // 4. now vertices close to a vertex can be found by looking at nearby cells

  async update() {
    // calculate hashes for each vertex
    this.hashProgram.setUniform('vertexData', this.vertexData);
    this.hashProgram.setUniform('cellSize', this.cellSize);
    this.hashProgram.setUniform('hashModulo', this.vertexCount);

    this.hashProgram.execute(this.hashTable);

    // download hashes
    const data = await this.hashTable.read(0, 0, this.hashTable.width, this.hashTable.height);
    // console.log(data.map(floatBitsToUint));
    this.buckets.fill(0);

    // count how many vertices are in each bucket
    for (let i = 0; i < this.vertexCount; i++)
      this.buckets[floatBitsToUint(data[i])]++;

    // console.log(this.buckets);

    // prefix sums to calculate where each bucket starts (offsets)
    for (let i = 1; i < this.vertexCount; i++)
      this.buckets[i] = this.buckets[i] + this.buckets[i - 1];

    for (let i = 0; i < this.vertexCount; i++)
      this.buckets2[i] = uintBitsToFloat(this.buckets[i]);

    this.offsets.write(0, 0, this.offsets.width, this.offsets.height, this.buckets2);
    // console.log(this.buckets);

    let zero = 0;

    for (let i = 0; i < this.vertexCount; i++) {
      let hash = floatBitsToUint(data[i]);
      let place = hash == 0 ? zero++ : this.buckets[hash - 1]++;
      this.vertices[place] = uintBitsToFloat(i);
      // this.vertices[place] = i;
    }

    // console.log(this.vertices);
    // return;

    // write vertices
    this.hashTable.write(0, 0, this.hashTable.width, this.hashTable.height, this.vertices);

    // repulse
    this.repulseProgram.setUniform('vertexData', this.vertexData);
    this.repulseProgram.setUniform('hashTable', this.hashTable);
    this.repulseProgram.setUniform('offsets', this.offsets);
    this.repulseProgram.setUniform('cellSize', this.cellSize);
    this.repulseProgram.setUniform('strength', this.repulsionStrength);
    this.repulseProgram.setUniform('hashModulo', this.vertexCount);

    this.repulseProgram.execute(this.velocities);

    // console.log(await this.velocities.read(0, 0, 4, 4));

    // move
    this.moveProgram.setUniform('vertexData', this.vertexData);
    this.moveProgram.setUniform('velocities', this.velocities);
    this.moveProgram.setUniform('deltaTime', 0.01);

    this.moveProgram.execute(this.vertexData);
  }
}