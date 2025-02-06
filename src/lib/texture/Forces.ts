import { attract } from "./attract.glsl";
import type { NewCompute } from "./compute/Compute";
import type { ComputeBuffer } from "./compute/ComputeBuffer";
import type { ComputeProgram } from "./compute/ComputeProgram";
import type { ForceAlgorithm } from "./ForceAlgorithm";
import { hash } from "./hash.glsl";
import { move } from "./move.glsl";
import { floatBitsToUint, uintBitsToFloat } from "./reinterpret";
import { repulse } from "./repulse.glsl";
import { Task } from "./Task";
import { Float2, Float4 } from "./TextureFormat";
import { Timer } from "./Timer";

export class Forces {
  private hashTable: ComputeBuffer;
  private offsets: ComputeBuffer;
  private velocities: ComputeBuffer;

  private hashProgram: ComputeProgram;

  private buckets: Float32Array;
  private buckets2: Float32Array;
  private vertices: Float32Array;

  private repulseProgram: ComputeProgram;
  private attractProgram: ComputeProgram;

  private moveProgram: ComputeProgram;

  public cellSize = 100;

  public cooling = 1;

  constructor(private algorithm: ForceAlgorithm, compute: NewCompute, private vertexCount: number, private vertexData: ComputeBuffer, private edgeData: ComputeBuffer) {
    this.hashTable = compute.createBuffer(vertexCount / 4);
    this.offsets = compute.createBuffer(vertexCount / 4);
    this.velocities = compute.createBuffer(vertexCount);

    this.hashProgram = compute.createProgram(hash);

    this.buckets = new Float32Array(this.offsets.size * 4);
    this.buckets2 = new Float32Array(this.offsets.size * 4);
    this.vertices = new Float32Array(this.offsets.size * 4);

    this.repulseProgram = compute.createProgram(algorithm.repulsionFunction() + repulse);
    this.attractProgram = compute.createProgram(algorithm.attractionFunction() + attract, { additive: true });

    this.moveProgram = compute.createProgram(move);
  }


  async resizeBuffers(vertexCount: number) {
    // Task.begin();

    // await Promise.all([
    //   this.hashTable.resizeBuffer(vertexCount / 4, false),
    //   this.offsets.resizeBuffer(vertexCount / 4, false),
    //   this.velocities.resizeBuffer(vertexCount, false),
    // ]);

    // this.buckets = new Float32Array(this.offsets.width * this.offsets.height * 4);
    // this.buckets2 = new Float32Array(this.offsets.width * this.offsets.height * 4);
    // this.vertices = new Float32Array(this.offsets.width * this.offsets.height * 4);

    // this.vertexCount = vertexCount;

    // Task.end();
  }

  // spatial hash algo
  // 1. divide the space into grid cells
  // 2. calculate a hash for each cell
  // 3. sort vertices into buckets based on their cell hash
  // 4. now vertices close to a vertex can be found by looking at nearby cells

  async update(delta: number) {
    if (this.cooling < 0.001) return;

    const timer = new Timer();
    timer.start('hash');

    const hashTableSize = this.hashTable.size * 4;

    // calculate hashes for each vertex
    this.hashProgram.setUniform('vertexData', this.vertexData);
    this.hashProgram.setUniform('cellSize', this.cellSize);
    this.hashProgram.setUniform('hashModulo', hashTableSize);

    this.hashProgram.execute(this.hashTable);

    timer.start('sort-read');

    // download hashes
    const data = await this.hashTable.read();
    // console.log(data.length);
    timer.start('sort-sort');


    this.buckets.fill(0);

    // count how many vertices are in each bucket
    for (let i = 0; i < this.vertexCount; i++)
      this.buckets[floatBitsToUint(data[i])]++;

    timer.start('offsets');


    // prefix sums to calculate where each bucket starts (offsets)
    for (let i = 1; i < hashTableSize; i++)
      this.buckets[i] = this.buckets[i] + this.buckets[i - 1];

    for (let i = 0; i < hashTableSize; i++)
      this.buckets2[i] = uintBitsToFloat(this.buckets[i]);

    const promiseOffsets = this.offsets.write(this.buckets2);

    timer.start('vertices');

    let zero = 0;

    for (let i = 0; i < this.vertexCount; i++) {
      let hash = floatBitsToUint(data[i]);
      let place = hash == 0 ? zero++ : this.buckets[hash - 1]++;
      this.vertices[place] = uintBitsToFloat(i);
    }

    // write vertices
    const promiseVertices = this.hashTable.write(this.vertices);

    await Promise.all([promiseOffsets, promiseVertices]);

    timer.start('repulse');


    this.repulseProgram.setUniform('vertexData', this.vertexData);
    this.repulseProgram.setUniform('hashTable', this.hashTable);
    this.repulseProgram.setUniform('offsets', this.offsets);
    this.repulseProgram.setUniform('cellSize', this.cellSize);
    this.repulseProgram.setUniform('hashModulo', hashTableSize);
    this.algorithm.setUniforms(this.repulseProgram);

    this.repulseProgram.execute(this.velocities);

    this.moveProgram.setUniform('vertexData', this.vertexData);
    this.moveProgram.setUniform('velocities', this.velocities);
    this.moveProgram.setUniform('deltaTime', delta * this.cooling);

    this.moveProgram.execute(this.vertexData);


    timer.start('attract');

    this.attractProgram.setUniform('vertexData', this.vertexData);
    this.attractProgram.setUniform('edgeData', this.edgeData);
    this.algorithm.setUniforms(this.attractProgram);

    this.attractProgram.execute(this.velocities, 2 * this.edgeData.size);


    // move
    this.moveProgram.setUniform('vertexData', this.vertexData);
    this.moveProgram.setUniform('velocities', this.velocities);
    this.moveProgram.setUniform('deltaTime', delta * this.cooling);


    this.cooling *= 0.999;

    // console.log(this.cooling);


    this.moveProgram.execute(this.vertexData);

    // timer.finish();

    // read vertex data
    // const vertexData = await this.vertexData.read(0, 0, 4, 4);
    // console.log(vertexData);
  }
}