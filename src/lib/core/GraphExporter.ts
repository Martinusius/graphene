import { fromByteArray } from "base64-js";
import type { Graph } from "./interface/Graph";
import { getMousePosition } from "$lib/input";
import { Vector2 } from "three";
import { DynamicArray } from "./DynamicArray";

export class GraphExporter {
  constructor(public readonly graph: Graph) { }

  async edgeList() {
    let result = '';

    await this.graph.transaction(() => {
      const edges: string[] = [];

      this.graph.edges.forEach(edge => {
        const { u, v } = edge;
        edges.push(`${u.index} ${v.index}`);
      });

      result = edges.join("\n");
    });

    return result;
  }

  async weightedEdgeList(weightProperty: string) {
    let result = '';

    await this.graph.transaction(() => {
      const edges: string[] = [];

      this.graph.edges.forEach(edge => {
        const { u, v } = edge;
        const weight = edge.getProperty(weightProperty);

        edges.push(`${u.index} ${v.index} ${weight}`);
      });

      result = edges.join("\n");
    });

    return result;
  }


  async graphene(all = true, cut = false, offset = new Vector2()) {
    let result = '';

    await this.graph.transaction(async () => {
      const vertexProperties = Object.entries(this.graph.vertexAuxiliary.properties)
        .sort((a, b) => a[1].index - b[1].index)
        .map(([name, property]) => ({ name, type: property.type }));

      const edgeProperties = Object.entries(this.graph.edgeAuxiliary.properties)
        .sort((a, b) => a[1].index - b[1].index)
        .map(([name, property]) => ({ name, type: property.type }));

      const vertexData = new DynamicArray(12);

      const vertices = this.graph.vertices;
      for (const vertex of vertices) {
        if (!all && !vertex.isSelected) continue;

        vertexData.pushFloat32(vertex.x - offset.x);
        vertexData.pushFloat32(vertex.y - offset.y);
        vertexData.pushUint32(vertex.id);

        for (const property of vertexProperties) {
          vertexData.pushUint32(this.graph.vertexAuxiliary.getProperty(property.name, vertex.index));
        }
      }

      const edgeData = new DynamicArray(8);

      const edges = this.graph.edges;
      for (const edge of edges) {
        if (!all && (!edge.isSelected || !edge.u.isSelected || !edge.v.isSelected)) continue;

        edgeData.pushUint32(edge.u.id);
        edgeData.pushUint32(edge.v.id);

        for (const property of edgeProperties) {
          edgeData.pushUint32(this.graph.edgeAuxiliary.getProperty(property.name, edge.index));
        }
      }

      const finalJson = {
        vertexProperties,
        edgeProperties,
        vertexData: fromByteArray(vertexData.toArray()),
        edgeData: fromByteArray(edgeData.toArray()),
      };


      if (cut) {
        for (const edge of edges) {
          if (all || edge.isSelected) edge.delete();
        }

        for (const vertex of vertices) {
          if (all || vertex.isSelected) vertex.delete();
        }
      }

      result = JSON.stringify(finalJson);
    });

    return result;
  }
}