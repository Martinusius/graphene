import type { DynamicArray } from "../../DynamicArray";
import type { Ids } from "../../Ids";
import { EDGE_SIZE, EdgeProperty, VERTEX_SIZE, VertexProperty } from "../Constants";
import { Operation } from "../Operation";

type State = { vertexCount: number; edgeCount: number; changed: boolean; opCount: number };

export class DirectedGraphRedo {
  constructor(
    private outcidency: Map<number, number>[],
    private incidency: Map<number, number>[],
    private state: State,
    private vertices: DynamicArray,
    private edges: DynamicArray,
    private undoStack: DynamicArray,
    private redoStack: DynamicArray,
    private whereVertex: Ids<number>,
    private whereEdge: Ids<number>
  ) { }

  private redoAddVertex() {
    this.outcidency.push(new Map());
    this.incidency.push(new Map());

    const nid = this.whereVertex.create(this.state.vertexCount);
    const id = this.redoStack.getUint32(this.redoStack.length - VERTEX_SIZE + VertexProperty.ID);

    if (id !== nid) throw new Error(`Id mismatch in redoAddVertex ${id} vs ${nid}`);

    this.vertices.pushFrom(this.redoStack, this.redoStack.length - VERTEX_SIZE, VERTEX_SIZE);
    this.redoStack.length -= VERTEX_SIZE;

    this.state.vertexCount++;

    this.undoStack.pushUint8(Operation.ADD_VERTEX);
  }

  private redoAddEdge() {
    const uIndex = this.redoStack.getUint32(this.redoStack.length - EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const vIndex = this.redoStack.getUint32(this.redoStack.length - EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const vid = this.vertices.getUint32(vIndex * VERTEX_SIZE + VertexProperty.ID);
    const uid = this.vertices.getUint32(uIndex * VERTEX_SIZE + VertexProperty.ID);

    if (this.outcidency[uIndex].has(vid)) throw new Error('Edge already exists in redoAddEdge (this should never happen)');


    const id = this.redoStack.getUint32(this.redoStack.length - EDGE_SIZE + EdgeProperty.ID);
    const nid = this.whereEdge.create(this.state.edgeCount);
    if (id !== nid) throw new Error('Id mismatch in redoAddEdge');

    this.edges.pushFrom(this.redoStack, this.redoStack.length - EDGE_SIZE, EDGE_SIZE);
    this.redoStack.length -= EDGE_SIZE;

    const existsInverse = this.edges.getUint32(this.state.edgeCount * EDGE_SIZE) & 2;

    if (existsInverse) {
      const inverseId = this.outcidency[vIndex].get(uid)!;
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edges.setUint32(inverseIndex * EDGE_SIZE, vIndex << 2 | 2);
    }

    this.state.edgeCount++;

    this.outcidency[uIndex].set(vid, id);
    this.incidency[vIndex].set(uid, id);

    this.undoStack.pushUint8(Operation.ADD_EDGE);
  }

  private redoDeleteVertex() {
    const vertexIndex = this.redoStack.popUint32();

    this.state.vertexCount--;

    const id = this.vertices.getUint32(vertexIndex * VERTEX_SIZE + VertexProperty.ID);
    this.whereVertex.delete(id);

    this.incidency[vertexIndex] = this.incidency[this.state.vertexCount];
    this.outcidency[vertexIndex] = this.outcidency[this.state.vertexCount];

    for (const outcidentEdgeId of this.outcidency[vertexIndex].values()) {
      const edgeIndex = this.whereEdge.get(outcidentEdgeId)!;
      const u = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      this.edges.setUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX, vertexIndex << 2 | u & 3);
    }

    for (const incidentEdgeId of this.incidency[vertexIndex].values()) {
      const edgeIndex = this.whereEdge.get(incidentEdgeId)!;
      const v = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX);
      this.edges.setUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX, vertexIndex << 2 | v & 3);
    }

    this.undoStack.pushFrom(this.vertices, vertexIndex * VERTEX_SIZE, VERTEX_SIZE);
    this.undoStack.pushUint32(vertexIndex);
    this.undoStack.pushUint8(Operation.DELETE_VERTEX);

    this.vertices.setFrom(this.vertices, this.state.vertexCount * VERTEX_SIZE, vertexIndex * VERTEX_SIZE, VERTEX_SIZE);
    this.vertices.length -= VERTEX_SIZE;

    const swappedId = this.vertices.getUint32(vertexIndex * VERTEX_SIZE + VertexProperty.ID);
    this.whereVertex.set(swappedId, vertexIndex);

    this.outcidency.pop();
    this.incidency.pop();
  }

  private redoDeleteEdge() {
    this.state.edgeCount--;

    const edgeIndex = this.redoStack.popUint32();

    const id = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.ID);
    this.whereEdge.delete(id);

    const uIndex = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const vIndex = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const uid = this.vertices.getUint32(uIndex * VERTEX_SIZE + VertexProperty.ID);
    const vid = this.vertices.getUint32(vIndex * VERTEX_SIZE + VertexProperty.ID);

    const existsInverse = this.edges.getUint32(edgeIndex * EDGE_SIZE) & 2;

    // if inverse edge exists, make it non-dual
    if (existsInverse) {
      const inverseId = this.outcidency[vIndex].get(uid)!;
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edges.setUint32(inverseIndex * EDGE_SIZE, vIndex << 2);
    }

    this.outcidency[uIndex].delete(vid);
    this.incidency[vIndex].delete(uid);

    this.undoStack.pushFrom(this.edges, edgeIndex * EDGE_SIZE, EDGE_SIZE);
    this.undoStack.pushUint32(edgeIndex);
    this.undoStack.pushUint8(Operation.DELETE_EDGE);

    this.edges.setFrom(this.edges, this.state.edgeCount * EDGE_SIZE, edgeIndex * EDGE_SIZE, EDGE_SIZE);
    this.edges.length -= EDGE_SIZE;

    const swappedId = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.ID);
    this.whereEdge.set(swappedId, edgeIndex);
  }

  redo() {
    if (this.redoStack.length === 0) {
      console.warn('Nothing to redo');
      return;
    }

    const opCount = this.redoStack.popUint32();
    for (let i = 0; i < opCount; i++) {
      const type = this.redoStack.popUint8();

      switch (type) {
        case Operation.ADD_VERTEX:
          this.redoAddVertex();
          break;
        case Operation.ADD_EDGE:
          this.redoAddEdge();
          break;
        case Operation.DELETE_VERTEX:
          this.redoDeleteVertex();
          break;
        case Operation.DELETE_EDGE:
          this.redoDeleteEdge();
          break;
      }
    }

    this.state.changed = this.state.changed || opCount > 0;
    this.state.opCount += opCount;
  }
}