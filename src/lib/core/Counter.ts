import type { Compute } from "./compute/Compute";
import type { ComputeBuffer } from "./compute/ComputeBuffer";
import type { ComputeProgram } from "./compute/ComputeProgram";
import { count } from "./count.glsl";

export class Counter {
  private countProgram: ComputeProgram;
  private countBuffer: ComputeBuffer;

  constructor(compute: Compute) {
    this.countProgram = compute.createProgram(count, { additive: true });
    this.countBuffer = compute.createBuffer(1);
  }

  async count(data: ComputeBuffer, id: number) {
    this.countProgram.setUniform("flagData", data);
    this.countProgram.setUniform("id", id);

    this.countProgram.execute(this.countBuffer, data.size);

    const result = await this.countBuffer.read();
    return result[0];
  }
}