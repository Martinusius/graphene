// Implementation of InternalGraph using Three.js
// Handles all the rendering and stuff

import { InternalGraph, InternalVertex, InternalEdge } from "./internalGraph";
import type { EdgeAttributes, VertexAttributes } from "./graph";

import { Color, Scene, Vector3 } from "three";
import { Bezier } from "./three/Bezier";
import { Point } from "./three/Point";

import { v4 } from "uuid";

export class ThreeVertex extends InternalVertex {
  declare graph: ThreeGraph;
  declare _edges: Set<ThreeEdge>;

  id = v4();

  _attributes: VertexAttributes;

  point: Point;

  constructor(graph: ThreeGraph, attributes?: VertexAttributes) {
    super(graph);

    this._attributes = attributes ?? {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    };

    this.point = Point.create(
      new Vector3(this._attributes.x!, this._attributes.y!, 0),
      "node-base",
      30
    );

    this.point.data = this;
  }

  override delete() {
    this.point.delete();
    this._edges.forEach((edge) => edge.bezier.delete());
    super.delete();
  }
}

export class ThreeEdge extends InternalEdge {
  declare graph: ThreeGraph;

  id = v4();
  incidencyId = (this.vertices as [ThreeVertex, ThreeVertex])
    .map((v) => v.id)
    .sort()
    .join("-");

  incidencyDirectedId = (this.vertices as [ThreeVertex, ThreeVertex])
    .map((v) => v.id)
    .join("-");

  _attributes: EdgeAttributes;

  bezier: Bezier;
  curveIndex: number = 0;

  recalculate() {
    const a = (this.vertices[0] as ThreeVertex).point.position.clone(),
      b = (this.vertices[1] as ThreeVertex).point.position.clone();
    const ac = a.clone().lerp(b, 0.25),
      bc = a.clone().lerp(b, 0.75);
    const dist = (a.distanceTo(b) / 4) * this.curveIndex;
    const up = a
      .clone()
      .sub(b)
      .normalize()
      .cross(
        new Vector3(
          0,
          0,
          this.incidencyId === this.incidencyDirectedId ? 1 : -1
        )
      )
      .multiplyScalar(dist);

    this.bezier.p0 = a;
    this.bezier.p1 = ac.clone().add(up);
    this.bezier.p2 = bc.clone().add(up);
    this.bezier.p3 = b;
  }

  constructor(
    graph: ThreeGraph,
    vertex1: ThreeVertex,
    vertex2: ThreeVertex,
    attributes?: EdgeAttributes
  ) {
    super(graph, vertex1, vertex2);

    this._attributes = attributes ?? {};

    // calculate bezier curve

    this.bezier = Bezier.create(
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Color("black"),
      5
    );

    this.bezier.data = this;

    this.recalculate();
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

  incidency = new Map<string, Set<ThreeEdge>>();

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

  override createEdge(
    vertex1: ThreeVertex,
    vertex2: ThreeVertex,
    attributes?: EdgeAttributes
  ) {
    const edge = new ThreeEdge(this, vertex1, vertex2, attributes);
    this._edges.add(edge);

    vertex1._edges.add(edge);
    vertex2._edges.add(edge);

    const incidencySet =
      this.incidency.get(edge.incidencyId) ?? new Set<ThreeEdge>();
    incidencySet.add(edge);
    this.incidency.set(edge.incidencyId, incidencySet);

    let i = 0;
    incidencySet.forEach((edge) => {
      edge.curveIndex = i++ - incidencySet.size / 2 + 0.5;
      edge.recalculate();
    });

    return edge;
  }
}
