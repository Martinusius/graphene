import { Vector2 } from "three";
import type { Graph, Vertex } from "./interface/Graph";
import { toByteArray } from "base64-js";
import { DynamicArray } from "./DynamicArray";
import type { Auxiliary, AuxiliaryType } from "./interface/Auxiliary";
import type { GrapheneJSON } from "./types";

export class GraphImporter {
  constructor(public readonly graph: Graph) { }

  edgeList(data: string) {
    return this.graph.transaction(() => {
      const indexToVertex: Vertex[] = [];

      data.split('\n').forEach(line => {
        const [u, v] = line.split(' ').map(Number);

        if (indexToVertex[u] === undefined) {
          indexToVertex[u] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }

        if (indexToVertex[v] === undefined) {
          indexToVertex[v] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }

        this.graph.addEdge(indexToVertex[u]!, indexToVertex[v]!);
      });
    });
  }

  weightedEdgeList(data: string, weightProperty = 'Weight') {
    return this.graph.transaction(() => {
      const indexToVertex: Vertex[] = [];

      data.split('\n').forEach(line => {
        const [u, v, weight] = line.split(' ').map(Number);

        if (indexToVertex[u] === undefined) {
          indexToVertex[u] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }

        if (indexToVertex[v] === undefined) {
          indexToVertex[v] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }

        const edge = this.graph.addEdge(indexToVertex[u]!, indexToVertex[v]!);
        edge.setProperty(weightProperty, weight);
      });
    });
  }

  async grapheneB64(data: string, offset = new Vector2()) {
    await this.graph.transaction(async () => {
      try {
        const { isDirected, vertexProperties, edgeProperties, vertexData, edgeData } = JSON.parse(data);
        if (isDirected !== this.graph.isDirected) {
          const from = isDirected ? 'a directed' : 'an undirected'
          const to = this.graph.isDirected ? 'a directed' : 'an undirected';

          throw new Error(`Cannot import ${from} graph into ${to} graph`);
        }

        function rectifyProperties(aux: Auxiliary, properties: { name: string, type: AuxiliaryType }[]) {
          for (const { name, type } of properties) {
            if (!aux.properties[name]) {
              aux.createProperty(name, type);
            }
            else if (aux.properties[name].type !== type) {
              throw Error(`Property ${name} already exists with a different type`);
            }
          }
        }

        rectifyProperties(this.graph.vertexAuxiliary, vertexProperties);
        rectifyProperties(this.graph.edgeAuxiliary, edgeProperties);

        const vertexDataArray = toByteArray(vertexData);
        const edgeDataArray = toByteArray(edgeData);

        const vertexSize = 12 + vertexProperties.length * 4;
        const edgeSize = 8 + edgeProperties.length * 4;

        const vertexIdConversion = new Map<number, number>();

        for (let i = 0; i < vertexDataArray.length; i += vertexSize) {
          const array = new DynamicArray(vertexSize);
          array.pushFrom(vertexDataArray, i, vertexSize);

          const vertex = this.graph.addVertex(array.getFloat32(0) + offset.x, array.getFloat32(4) + offset.y);

          vertexIdConversion.set(array.getUint32(8), vertex.id);

          for (let j = 0; j < vertexProperties.length; j++) {
            const name = vertexProperties[j].name;
            this.graph.vertexAuxiliary.setProperty(name, vertex.index, array.getUint32(12 + j * 4));
          }
        }

        for (let i = 0; i < edgeData.length; i += edgeSize) {
          const array = new DynamicArray(edgeSize);
          array.pushFrom(edgeDataArray, i, edgeSize);

          const u = this.graph.getVertex(vertexIdConversion.get(array.getUint32(0))!);
          const v = this.graph.getVertex(vertexIdConversion.get(array.getUint32(4))!);

          if (u && v) {
            const edge = this.graph.addEdge(u!, v!);

            for (let j = 0; j < edgeProperties.length; j++) {
              const name = edgeProperties[j].name;
              this.graph.edgeAuxiliary.setProperty(name, edge.index, array.getUint32(8 + j * 4));
            }
          }
        }
      } catch (error) {
        alert(error);
      }
    });
  }

  async grapheneJSON(data: string, offset = new Vector2()) {
    await this.graph.transaction(async () => {
      try {
        const { isDirected, vertexProperties, edgeProperties, vertexData, edgeData } = JSON.parse(data) as GrapheneJSON;
        if (isDirected !== this.graph.isDirected) {
          const from = isDirected ? 'a directed' : 'an undirected'
          const to = this.graph.isDirected ? 'a directed' : 'an undirected';

          throw new Error(`Cannot import ${from} graph into ${to} graph`);
        }

        function rectifyProperties(aux: Auxiliary, properties: { name: string, type: AuxiliaryType }[]) {
          for (const { name, type } of properties) {
            if (!aux.properties[name]) {
              aux.createProperty(name, type);
            }
            else if (aux.properties[name].type !== type) {
              throw Error(`Property ${name} already exists with a different type`);
            }
          }
        }

        rectifyProperties(this.graph.vertexAuxiliary, vertexProperties);
        rectifyProperties(this.graph.edgeAuxiliary, edgeProperties);

        const vertexIdConversion = new Map<number, number>();

        for (const vertex of vertexData) {
          const v = this.graph.addVertex(vertex.x + offset.x, vertex.y + offset.y);
          vertexIdConversion.set(vertex.id, v.id);

          for (const property of vertexProperties) {
            this.graph.vertexAuxiliary.setProperty(property.name, v.index, vertex.properties[property.name]);
          }
        }

        for (const edge of edgeData) {
          const u = this.graph.getVertex(vertexIdConversion.get(edge.u)!);
          const v = this.graph.getVertex(vertexIdConversion.get(edge.v)!);

          if (u && v) {
            const e = this.graph.addEdge(u!, v!);

            for (const property of edgeProperties) {
              this.graph.edgeAuxiliary.setProperty(property.name, e.index, edge.properties[property.name]);
            }
          }
        }
      } catch (error) {
        alert(error);
      }
    });
  }
}