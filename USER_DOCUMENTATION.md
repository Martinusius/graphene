# User documentation

The UI consists of three main parts. The menubar, the sidebar and the editor window itself.

## Menubar

The menubar allow quick access to basic functions of the editor. Most of the features can also be used via keyboard shortcuts which is also recommended.

The menubar consists of these sections:

- File - Create a new (un)directed graph. Import/export graph.
- Edit - Basic edit operations such undo/redo and copy/paste.
- Selection - Select entire graph, invert selection and other selection operations.
- Preferences - Toggle force directed algorithm, grid etc.
- Tools - Merging vertices into one, inteconnecting vertices and creating a subgraph from the current selection.
- Generate - Generate common graph structures.
- Algorithms - Run basic graph algorithms such as DFS, BFS and Dijkstra.
- Scripts (coming soon) - Execute custom user scripts on the graph.

## Tools

Merge (M) - Merges all selected vertices into one while keeping the edges that connect to other vertices. All affected vertices and edges are recreated and all their properties are reset.

Cliqueify (K) - Create all possible edges between all pairs of selected vertices (A.K.A. form a clique). Edges that already exist will not be affected. For directional graphs edges in both directions are created. Do not use this operation on very big selections of vertices since it can result in too many edges.

Subgraph (H) - Delete all vertices and edges that are not currently selected. Edges incident to an unselected vertex will be deleted regardless.

## Sidebar

The sidebar allows the user to view details of the current graph selection. For example the number of vertices and edges selected and their average position.

Which single vertex/edge is selected the user can also edit the properties of the given object and select which property should be displayed as text. All vertices have the same set of properties. Same apllies to the edges. The properties can contain arbitrary data, but they can also be used as inputs/outputs of the algorithms.

Currently there are three types of properties available: Integer, @Vertex, @Edge.

# Algorithms

DFS - Performs a depth-first search from a root vertex and for each vertex outputs the order of visiting (depth) and/or the previous vertex in the search.

BFS - Perfoms a breadth-first search frin a root vertex and outputs the shortest distance to each vertex in edges and/or the previous vertex on the shortest path.

Dijkstra - Performs the Dijkstra's algorithm and outputs the shortest distances to all vertices from the root vertex given an edge distance (weight) property. Also can output previous vertices on the path similar to the other algorithms.

## Editor

Navigation around the editor can be done either by right-click dragging and scrolling, or by using touch gestures.

Vertices/edges can either be selected individually or by using rectangular selection. Shift key allows the user to keep selecting and Alt allows the user to subtract from the current selection. The selection can also be dragged around.

To create a new vertex the `Q` shortcut can be used which creates a new vertex at the mouse position and connects it to all currently selected vertices. After the creation the new vertex is selected.

To create edges the `E` shortcut can be used which connects all selected vertices to the currently hovered vertex.

## Quirks and recommendations

1. Selecting and dragging is not classified as an edit operation and therefore does not constitude an undo step. Adding/removing objects or editing their custom properties however all do count and can be undone.

2. Integer-based custom properties (currently all of them) have a non-standard range in order to support inconsistent WebGL implementations. Using values close to the maximum or minimum or relying on overflow behavior is not recommended.

3. Graphene currently runs best on Firefox, though Chrome should work fine for reasonably sized graphs (m + n < 100000). Larger graphs can be problematic because Chrome does something weird with the GPU during user interactions (most noticable during scrolling) which slows everything down and results in big FPS drops.

4. Editing larger graphs than your computer can handle might sometimes result in hover/selection issues caused by CPU-GPU desync.
