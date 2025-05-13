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

## Sidebar

The sidebar allows the user to view details of the current graph selection. For example the number of vertices and edges selected and their average position.

Which single vertex/edge is selected the user can also edit the properties of the given object and select which property should be displayed as text. All vertices have the same set of properties. Same apllies to the edges.

Currently there are three types of properties available: Integer, @Vertex, @Edge.

## Editor

Navigation around the editor can be done either by right-click dragging and scrolling, or by using touch gestures.

Vertices/edges can either be selected individually or by using rectangular selection. Shift key allows the user to keep selecting and Alt allows the user to subtract from the current selection. The selection can also be dragged around.

To create a new vertex the `Q` shortcut can be used which creates a new vertex at the mouse position and connects it to all currently selected vertices. After the creation the new vertex is selected.

To create edges the `E` shortcut can be used which connects all selected vertices to the currently hovered vertex.

## Quirks

1. Selecting and dragging is not classified as an edit operation and therefore does not constitude an undo step. Adding/removing objects or editing their custom properties however all do count and can be undone.

2. Integer-based custom properties (currently all of them) have a non-standard range in order to support inconsistent WebGL implementations. Using values close to the maximum or minimum or relying on overflow behavior is not recommended.

