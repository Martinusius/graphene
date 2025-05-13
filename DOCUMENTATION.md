# Developer documentation

### Rendering

Rendering is done as efficiently as possible with most work being done on the GPU. Vertices are rendered using gl.POINTS with all the visuals being calculated in the shaders. Edges are implemented using instanced geometries. All positions and colors are calculated on the GPU.

### Compute

All vertex and edge data is (also) stored in WebGL textures. This is done because it allows the data to be manipulated (drawn onto) using WebGL shaders allowing further optimizations with certain graph operations. This approach is quite similar to how compute shaders work, however since compute shaders are not available in WebGL, there is no better way to do this.

The project now also includes an entire emulated compute pipeline using the available WebGL features. The pipeline is used in the form of abstraction via classes such as ComputeProgram or ComputeBuffer. Although these classes can do most of what regular compute shaders can, there are still a some features missing.

### Force directed algorithm

Force directed algorithms generally consist of two parts. Repulsion forces of the vertices and spring forces of the edges. The repulsion forces are the tricky part. Each pair of vertices repulse each other, however for many vertices (for example 100000) the number of pairs of vertices is simply too much, especially if the forces are to be calculated at every frame. Fortunately most of these pairs do not contribute much to the resulting forces. To get a good approximation of the total forces it is enough to consider those pairs of vertices that are within a certain distance of each other and ignore the rest.

To find vertices close to a given vertex I decided to first calculate spatial hashes of each vertex. This means the space is subdivided into grid cells each with a (hopefully) unique hash value. The vertex gets the hash value of its grid cell. Next, vertices are grouped by their hashes. This is done using bucket sort on the CPU. Unfortunately this means the data has to first be downloaded from the GPU, then the CPU bucket sorts it, and then is has to be uploaded to the GPU again. This is the main bottleneck of the entire force directed algorithm.

The vertices could also be sorted on the GPU, however, sorting algorithms on the GPU are generally quite slow. For example, the Bitonic Mergesort operates in O(n\*log(n)^2) which roughly equates to log(n)^2 draw calls. That is simply too slow. Using atomic operations it is actually possible to implement something similar to a bucket sort, which could also improve the performance. 

After the vertices are grouped by their grid cell, the vertices can now look into their cell and nearby cells for other close vertices from which to calculate the approximate repulsion force.

The spring forces are much simpler although they require a small trick. Each individual edge can calculate the force it produces, however for each vertex, the forces off all the incident edges have to be added together. This can be implemented using additive color blending in WebGL. Then addition of forces is then simply emulated by drawing multiple pixels on the same position in the texture which corresponds to the vertex. This is somewhat similar to what atomic operations do although it is still (to my knowledge) not enough for the bucket sort implementation.

The current implementation of the forces is based on the Eades' Algorithm.

### Adding and deleting vertices and edges

Since GPU buffers (internally implemented using textures) are very simple structures they do not allow arbitrary additions and deletions (such as for example a dictionary would). Addition can be resolved by geometric expansion of the buffer. Deletions however are a bit more complicated. The deleted object (vertex or edge) could be simply marked as deleted and then skipped while rendering, 

The way I decided to do it is to always keep the object data in the buffer contiguous. When an object is supposed to be deleted it is swapped with the last object in the buffer and only then it is deleted. The downside is that now for addition or deletion the data has to be downloaded, changed, and uploaded. This is implemented using so-called transactions which manage the synchronization of the data. The graph shouldn't be edited outside a transaction (apart from dragging and selecting).

### Undo/redo

The editor also supports undo/redo. Currently this is implemented by simply cloning all the data after every change (with a limit of 32 undo steps). For small changes this is very inefficient (both in terms of time and space) although for now it seems to be good enough. In the future I would like to implement a smarter way to do this.

### Auxiliary buffers, custom properties, and text rendering

Both vertices and edges can also have some auxiliary data attached to them (for example edge weights for Dijkstra). This data is stored both on the CPU and on the GPU. The GPU can use this data to efficiently render the data as text if needed. Since the data has to be synced, it is stored in special auxiliary buffers. One buffer can contain 4 4-byte values per vertex/edge (since it's an RGBA texture under the hood). If the user needs more data to be stored, more buffers are allocated. The user can create their own custom vertex/edge properties in the UI. Currently there are three property types supported: Integer, VertexRef, EdgeRef. All vertices have the same set of properties. Same apllies to the edges.

The text is rendered using a pre-rendered font texture atlas. The numeric values are converted to characters on the GPU, which is also the main reason why floats are not supported yet, since parsing them in GLSL is very unreliable. Currenly a maximum of 8 characters can be rendered per vertex/edge.

### Graph algorithms

The editor allows running basic graph algorithms such as BFS, DFS and Dijkstra which read inputs and write outputs to the custom properties. The Dijkstra implementation uses [@tyriar/fibonacci-heap](https://www.npmjs.com/package/@tyriar/fibonacci-heap) for slightly better time complexity.


### Custom graph format and copy/paste

The custom format for storing the graph is simply a JSON containing the properties and then the contents of the buffers in base 64. This format is used for both exporting/imporing the graph and  copy/pasting parts of the graph. Other import/export formats are also available although this one specifically retains all the information about the graph.

### User interface

The project is using the [svelte](https://svelte.dev/) framework.

The UI is built using components from [shadcn-svelte](https://next.shadcn-svelte.com/). Don't they just look amazing?

### Building the project

The project uses [pnpm](https://pnpm.io/) to manage packages and [vite](https://vite.dev/) for bundling.

How to run in dev mode:

`pnpm install`

`pnpm run dev`





