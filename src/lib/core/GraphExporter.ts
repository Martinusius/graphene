import type { Graph } from "./interface/Graph";
import { Vector2 } from "three";
import { DynamicArray } from "./DynamicArray";
import type { GrapheneJSON } from "./types";
import { valueToJSON } from "../../Properties";

import { BSON } from "bson";

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

      if (!this.graph.edgeAuxiliary.properties[weightProperty]) {
        throw new Error(`Edge property "${weightProperty}" does not exist.`);
      }

      this.graph.edges.forEach(edge => {
        const { u, v } = edge;
        const weight = edge.getProperty(weightProperty);

        edges.push(`${u.index} ${v.index} ${weight}`);
      });

      result = edges.join("\n");
    });

    return result;
  }


  async grapheneBinary(all = true, cut = false, offset = new Vector2()) {
    let result: Uint8Array = new Uint8Array();

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
        isDirected: this.graph.isDirected,
        vertexProperties,
        edgeProperties,
        vertexData: vertexData.toArray(),
        edgeData: edgeData.toArray(),
      };

      if (cut) {
        for (const edge of edges) {
          if (all || edge.isSelected) edge.delete();
        }

        for (const vertex of vertices) {
          if (all || vertex.isSelected) vertex.delete();
        }
      }

      result = BSON.serialize(finalJson);
    });

    return result;
  }

  async grapheneJSON(all = true, cut = false, offset = new Vector2()) {
    let result = '';

    await this.graph.transaction(async () => {
      const vertexProperties = Object.entries(this.graph.vertexAuxiliary.properties)
        .sort((a, b) => a[1].index - b[1].index)
        .map(([name, property]) => ({ name, type: property.type }));

      const edgeProperties = Object.entries(this.graph.edgeAuxiliary.properties)
        .sort((a, b) => a[1].index - b[1].index)
        .map(([name, property]) => ({ name, type: property.type }));

      const json: GrapheneJSON = {
        isDirected: this.graph.isDirected,
        vertexProperties,
        edgeProperties,
        vertexData: [],
        edgeData: [],
      };

      const vertices = this.graph.vertices;
      for (const vertex of vertices) {
        if (!all && !vertex.isSelected) continue;

        json.vertexData.push({
          x: vertex.x - offset.x,
          y: vertex.y - offset.y,
          id: vertex.id,
          properties: {},
        });

        for (const property of vertexProperties) {
          const value = this.graph.vertexAuxiliary.getProperty(property.name, vertex.index);
          json.vertexData[json.vertexData.length - 1].properties[property.name] = valueToJSON(value, property.type);
        }
      }


      const edges = this.graph.edges;
      for (const edge of edges) {
        if (!all && (!edge.isSelected || !edge.u.isSelected || !edge.v.isSelected)) continue;

        json.edgeData.push({
          u: edge.u.id,
          v: edge.v.id,
          properties: {},
        });

        for (const property of edgeProperties) {
          const value = this.graph.edgeAuxiliary.getProperty(property.name, edge.index);
          json.edgeData[json.edgeData.length - 1].properties[property.name] = valueToJSON(value, property.type);
        }
      }


      if (cut) {
        for (const edge of edges) {
          if (all || edge.isSelected) edge.delete();
        }

        for (const vertex of vertices) {
          if (all || vertex.isSelected) vertex.delete();
        }
      }

      result = JSON.stringify(json);
    });

    return result;
  }
}

