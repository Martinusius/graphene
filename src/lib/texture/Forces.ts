import { attract } from "./attract.glsl";
import type { Compute } from "./compute/Compute";
import type { ComputeBuffer } from "./compute/ComputeBuffer";
import type { ComputeProgram } from "./compute/ComputeProgram";
import type { Edges } from "./Edges";
import type { ForceAlgorithm } from "./ForceAlgorithm";
import { hash } from "./hash.glsl";
import { move } from "./move.glsl";
import { floatBitsToUint, uintBitsToFloat } from "./reinterpret";
import { repulse } from "./repulse.glsl";
import { Task } from "./Task";
import { Float2, Float4 } from "./TextureFormat";
import { Timer } from "./Timer";
import type { Vertices } from "./Vertices";

export class Forces {
  private hashTable: ComputeBuffer;
  private offsets: ComputeBuffer;
  private velocities: ComputeBuffer;

  private hashProgram: ComputeProgram;

  private buckets: Float32Array;
  private buckets2: Float32Array;
  private vertexArray: Float32Array;

  private repulseProgram: ComputeProgram;
  private attractProgram: ComputeProgram;

  private moveProgram: ComputeProgram;

  public cellSize = 100;

  public cooling = 1;

  constructor(
    private algorithm: ForceAlgorithm,
    compute: Compute,
    private vertices: Vertices,
    private edges: Edges,
    private vertexData: ComputeBuffer,
    private edgeData: ComputeBuffer
  ) {
    this.hashTable = compute.createBuffer(Math.ceil(vertices.count / 4));
    this.offsets = compute.createBuffer(Math.ceil(vertices.count / 4));
    this.velocities = compute.createBuffer(vertices.count);

    this.hashProgram = compute.createProgram(hash);

    this.buckets = new Float32Array(this.offsets.size * 4);
    this.buckets2 = new Float32Array(this.offsets.size * 4);
    this.vertexArray = new Float32Array(this.offsets.size * 4);

    this.repulseProgram = compute.createProgram(
      algorithm.repulsionFunction() + repulse
    );
    this.attractProgram = compute.createProgram(
      algorithm.attractionFunction() + attract,
      { additive: true }
    );

    this.moveProgram = compute.createProgram(move);
  }

  private async resizeBuffersIfNeeded() {
    // console.log('check');
    if (this.vertices.count > this.velocities.size) {
      // console.log('resize', Math.ceil(this.vertices.count / 4));
      await Promise.all([
        this.hashTable.resizeErase(Math.ceil(this.vertices.count / 4)),
        this.offsets.resizeErase(Math.ceil(this.vertices.count / 4)),
        this.velocities.resizeErase(this.vertices.count),
      ]);

      this.buckets = new Float32Array(this.offsets.size * 4);
      this.buckets2 = new Float32Array(this.offsets.size * 4);
      this.vertexArray = new Float32Array(this.offsets.size * 4);

      // console.log('hashtable', this.hashTable.size);
    }
  }

  // spatial hash algo
  // 1. divide the space into grid cells
  // 2. calculate a hash for each cell
  // 3. sort vertices into buckets based on their cell hash
  // 4. now vertices close to a vertex can be found by looking at nearby cells

  // private processing = false;

  async update(delta: number) {
    if (this.cooling < 0.001) return;

    await this.resizeBuffersIfNeeded();

    if (this.hashTable.size === 0) return;

    const timer = new Timer();
    timer.start("hash");

    const hashTableSize = this.hashTable.size * 4;

    // calculate hashes for each vertex
    this.hashProgram.setUniform("vertexData", this.vertexData);
    this.hashProgram.setUniform("cellSize", this.cellSize);
    this.hashProgram.setUniform("hashModulo", hashTableSize);

    this.hashProgram.execute(this.hashTable);

    timer.start("sort-read");

    // download hashes
    const data = await this.hashTable.read();
    timer.start("sort-sort");

    this.buckets.fill(0);

    if (this.vertices.count > data.length) {
      console.log("miss");

      return;
    }

    // count how many vertices are in each bucket
    for (let i = 0; i < this.vertices.count; i++)
      this.buckets[floatBitsToUint(data[i])]++;

    timer.start("offsets");

    // prefix sums to calculate where each bucket starts (offsets)
    for (let i = 1; i < hashTableSize; i++)
      this.buckets[i] = this.buckets[i] + this.buckets[i - 1];

    for (let i = 0; i < hashTableSize; i++)
      this.buckets2[i] = uintBitsToFloat(this.buckets[i]);

    const promiseOffsets = this.offsets.write(this.buckets2);

    timer.start("vertices");

    let zero = 0;

    for (let i = 0; i < this.vertices.count; i++) {
      let hash = floatBitsToUint(data[i]);
      let place = hash == 0 ? zero++ : this.buckets[hash - 1]++;
      this.vertexArray[place] = uintBitsToFloat(i);
    }

    const promiseVertices = this.hashTable.write(this.vertexArray);

    await Promise.all([promiseOffsets, promiseVertices]);

    timer.start("repulse");

    this.repulseProgram.setUniform("vertexData", this.vertexData);
    this.repulseProgram.setUniform("hashTable", this.hashTable);
    this.repulseProgram.setUniform("offsets", this.offsets);
    this.repulseProgram.setUniform("cellSize", this.cellSize);
    this.repulseProgram.setUniform("hashModulo", hashTableSize);
    this.algorithm.setUniforms(this.repulseProgram);

    this.repulseProgram.execute(this.velocities);

    this.moveProgram.setUniform("vertexData", this.vertexData);
    this.moveProgram.setUniform("velocities", this.velocities);
    this.moveProgram.setUniform("deltaTime", delta * this.cooling);

    this.moveProgram.execute(this.vertexData);

    timer.start("attract");

    this.attractProgram.setUniform("vertexData", this.vertexData);
    this.attractProgram.setUniform("edgeData", this.edgeData);
    this.algorithm.setUniforms(this.attractProgram);

    this.attractProgram.execute(this.velocities, 2 * this.edges.count);

    this.moveProgram.setUniform("vertexData", this.vertexData);
    this.moveProgram.setUniform("velocities", this.velocities);
    this.moveProgram.setUniform("deltaTime", delta * this.cooling);

    //this.cooling *= 0.999;

    this.moveProgram.execute(this.vertexData);
  }
}
