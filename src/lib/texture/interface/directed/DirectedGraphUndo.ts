import type { DynamicArray } from "../../DynamicArray";
import type { Ids } from "../../Ids";
import type { Auxiliary } from "../Auxiliary";
import { EDGE_SIZE, EdgeProperty, VERTEX_SIZE, VertexProperty } from "../Constants";
import { Operation } from "../Operation";

type State = {
  vertexCount: number;
  edgeCount: number;
  changed: boolean;
};

export class DirectedGraphUndo {
  constructor(
    private outcidency: Map<number, number>[],
    private incidency: Map<number, number>[],
    private state: State,
    private vertices: DynamicArray,
    private edges: DynamicArray,
    private undoStack: DynamicArray,
    private redoStack: DynamicArray,
    private whereVertex: Ids<number>,
    private whereEdge: Ids<number>,
    private vertexAuxiliary: Auxiliary,
    private edgeAuxiliary: Auxiliary
  ) { }

  private undoAddVertex() {
    this.state.vertexCount--;

    // Push vertex data to redo stack
    this.vertexAuxiliary.popObjectToArray(this.redoStack);
    this.redoStack.pushFrom(this.vertices, this.state.vertexCount * VERTEX_SIZE, VERTEX_SIZE);
    this.redoStack.pushUint8(Operation.ADD_VERTEX);

    // Free the vertex id
    const id = this.vertices.getUint32(this.state.vertexCount * VERTEX_SIZE + VertexProperty.ID);
    this.whereVertex.delete(id);


    // Delete the incidency data of the vertex
    this.outcidency.pop();
    this.incidency.pop();

    // Mark the vertex data as deleted
    this.vertices.length -= VERTEX_SIZE;
  }

  private undoAddEdge() {
    this.state.edgeCount--;

    // Push edge data to redo stack
    this.edgeAuxiliary.popObjectToArray(this.redoStack);
    this.redoStack.pushFrom(this.edges, this.state.edgeCount * EDGE_SIZE, EDGE_SIZE);
    this.redoStack.pushUint8(Operation.ADD_EDGE);

    // Get indices and ids of the edge's vertices
    const uIndex = this.edges.getUint32(this.state.edgeCount * EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const vIndex = this.edges.getUint32(this.state.edgeCount * EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const uid = this.vertices.getUint32(uIndex * VERTEX_SIZE + VertexProperty.ID);
    const vid = this.vertices.getUint32(vIndex * VERTEX_SIZE + VertexProperty.ID);

    // If this edge is dual <-> inverted edge exists: make it non-dual
    const existsInverse = this.edges.getUint32(this.state.edgeCount * EDGE_SIZE) & 2;

    if (existsInverse) {
      const inverseId = this.outcidency[vIndex].get(uid)!;
      const inverseUIndex = this.whereEdge.get(inverseId)!;
      this.edges.setUint32(inverseUIndex * EDGE_SIZE + EdgeProperty.U_INDEX, vIndex << 2);
    }

    // Remove the incidencies from the vertices
    this.outcidency[uIndex].delete(vid);
    this.incidency[vIndex].delete(uid);

    // Free the edge id
    const id = this.edges.getUint32(this.state.edgeCount * EDGE_SIZE + EdgeProperty.ID);
    this.whereEdge.delete(id);

    // Mark the edge data as deleted
    this.edges.length -= EDGE_SIZE;
  }

  private undoDeleteVertex() {
    // From which index the vertex was deleted
    const vertexIndex = this.undoStack.popUint32();

    // Put the vertex at the deleted index back to the end of the buffer (inverse of what was done in deleteVertex)
    this.vertices.length += VERTEX_SIZE;
    this.vertices.setFrom(this.vertices, vertexIndex * VERTEX_SIZE, this.state.vertexCount * VERTEX_SIZE, VERTEX_SIZE);

    // Get the id of the moved vertex
    const swappedId = this.vertices.getUint32(vertexIndex * VERTEX_SIZE + VertexProperty.ID);
    this.vertices.popFrom(this.undoStack, vertexIndex * VERTEX_SIZE, VERTEX_SIZE);
    this.vertexAuxiliary.pushObjectFromArray(this.undoStack);
    this.vertexAuxiliary.swapObjectsLast(vertexIndex);

    // Generate new id and make sure it matches the old one (it should!)
    const id = this.vertices.getUint32(vertexIndex * VERTEX_SIZE + VertexProperty.ID);
    const nid = this.whereVertex.create(vertexIndex); // Ids implementation guarantees the id will be the same as last time
    if (id !== nid) throw new Error('Id mismatch in undoDeleteVertex');

    // If the deleted vertex was last, no vertices were moved
    // Otherwise we need to update the index of the moved vertex
    if (vertexIndex !== this.state.vertexCount) this.whereVertex.set(swappedId, this.state.vertexCount);

    // Create incidencies for the deleted vertex and move the incidencies of the moved vertex
    this.outcidency.push(this.outcidency[vertexIndex] ?? new Map());
    this.outcidency[vertexIndex] = new Map();

    this.incidency.push(this.incidency[vertexIndex] ?? new Map());
    this.incidency[vertexIndex] = new Map();

    // Change the edges of the moved vertex to point to the new index
    for (const outcidentEdgeId of this.outcidency[this.state.vertexCount].values()) {
      const edgeIndex = this.whereEdge.get(outcidentEdgeId)!;
      const u = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      this.edges.setUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX, this.state.vertexCount << 2 | u & 3);
    }

    for (const incidentEdgeId of this.incidency[this.state.vertexCount].values()) {
      const edgeIndex = this.whereEdge.get(incidentEdgeId)!;
      const v = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX);
      this.edges.setUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX, this.state.vertexCount << 2 | v & 3);
    }

    this.redoStack.pushUint32(vertexIndex);
    this.redoStack.pushUint8(Operation.DELETE_VERTEX);

    this.state.vertexCount++;
  }

  private undoDeleteEdge() {
    const edgeIndex = this.undoStack.popUint32();

    this.edges.length += EDGE_SIZE;
    this.edges.setFrom(this.edges, edgeIndex * EDGE_SIZE, this.state.edgeCount * EDGE_SIZE, EDGE_SIZE);

    const swappedId = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.ID);
    this.edges.popFrom(this.undoStack, edgeIndex * EDGE_SIZE, EDGE_SIZE);
    this.edgeAuxiliary.pushObjectFromArray(this.undoStack);
    this.edgeAuxiliary.swapObjectsLast(edgeIndex);

    const id = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.ID);
    const nid = this.whereEdge.create(edgeIndex); // Ids implementation guarantees the id will be the same as last time
    if (id !== nid) throw new Error('Id mismatch in undoDeleteEdge');

    if (edgeIndex !== this.state.edgeCount) this.whereEdge.set(swappedId, this.state.edgeCount);

    const uIndex = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const vIndex = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const uid = this.vertices.getUint32(uIndex * VERTEX_SIZE + EdgeProperty.ID);
    const vid = this.vertices.getUint32(vIndex * VERTEX_SIZE + EdgeProperty.ID);

    const inverseId = this.incidency[uIndex].get(vid);

    this.outcidency[uIndex].set(vid, id);
    this.incidency[vIndex].set(uid, id);

    if (inverseId) {
      const inverseIndex = this.whereEdge.get(inverseId)!;
      const inverseU = this.edges.getUint32(inverseIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      this.edges.setUint32(inverseIndex * EDGE_SIZE + EdgeProperty.U_INDEX, inverseU | 2);
    }

    this.redoStack.pushUint32(edgeIndex);
    this.redoStack.pushUint8(Operation.DELETE_EDGE);

    this.state.edgeCount++;
  }

  undo(operation: Operation) {
    // if (this.undoStack.length === 0) {
    //   console.warn('Nothing to undo');
    //   return;
    // }

    // const opCount = this.undoStack.popUint32();

    // for (let i = 0; i < opCount; i++) {
    // const type = this.undoStack.popUint8();

    switch (operation) {
      case Operation.ADD_VERTEX:
        this.undoAddVertex();
        return true;
      case Operation.ADD_EDGE:
        this.undoAddEdge();
        return true;
      case Operation.DELETE_VERTEX:
        this.undoDeleteVertex();
        return true;
      case Operation.DELETE_EDGE:
        this.undoDeleteEdge();
        return true;
      default:
        return false;
    }
    // }

    // this.state.changed = this.state.changed || opCount > 0;
    // this.redoStack.pushUint32(opCount);
  }
}