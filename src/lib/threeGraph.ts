// Implementation of InternalGraph using Three.js
// Handles all the rendering and stuff

import { InternalGraph, InternalVertex, InternalEdge } from "./internalGraph";
import type { EdgeAttributes, VertexAttributes } from './graph';

import { Color, Scene, Vector3 } from 'three';
import { Bezier } from './three/Bezier';
import { Point } from './three/Point';

export class ThreeVertex extends InternalVertex {
  declare graph: ThreeGraph;
  declare _edges: Set<ThreeEdge>;

  _attributes: VertexAttributes;

  point: Point;

  constructor(graph: ThreeGraph, attributes?: VertexAttributes) {
    super(graph);

    this._attributes = attributes ?? {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    };

    this.point = Point.create(new Vector3(this._attributes.x!, this._attributes.y!, 0), 'node-base', 20);

  }

  override delete() {
    this.point.delete();
    this._edges.forEach(edge => edge.bezier.delete());
    super.delete();
  }
}

export class ThreeEdge extends InternalEdge {
  declare graph: ThreeGraph;

  _attributes: EdgeAttributes;

  bezier: Bezier;

  constructor(graph: ThreeGraph, vertex1: ThreeVertex, vertex2: ThreeVertex, attributes?: EdgeAttributes) {
    super(graph, vertex1, vertex2);

    this._attributes = attributes ?? {};

    // calculate bezier curve
    const a = vertex1.point.position.clone(), b = vertex2.point.position.clone();
    const ac = a.clone().lerp(b, 0.25), bc = a.clone().lerp(b, 0.75);
    const dist = -a.distanceTo(b) / 4;
    const up = a.clone().sub(b).normalize().cross(new Vector3(0, 0, 1)).multiplyScalar(dist);

    this.bezier = Bezier.create(a, ac.clone().add(up), bc.clone().add(up), b, new Color('black'), 10);
  }

  override delete() {
    this.bezier.delete();
    super.delete();
  }

}

export class ThreeGraph extends InternalGraph {
  constructor(public scene: Scene) {
    super();
  }

  _directed = false;
  get directed() {
    return this._directed;
  }

  set directed(directed: boolean) {
    this._directed = directed;
  }

  override createVertex(attributes?: VertexAttributes) {
    const vertex = new ThreeVertex(this, attributes);
    this._vertices.add(vertex);
    return vertex;
  }

  override createEdge(vertex1: ThreeVertex, vertex2: ThreeVertex, attributes?: EdgeAttributes) {
    const edge = new ThreeEdge(this, vertex1, vertex2, attributes);
    this._edges.add(edge);
    return edge;
  }
}