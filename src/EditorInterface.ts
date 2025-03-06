export type Operations = {
  delete: () => void;
  merge: () => void;
  cliqueify: () => void;
  subgraph: () => void;
  
  undo: () => void;
  redo: () => void;
  
};

export type Flags = {
  isUndoable: boolean;
  isRedoable: boolean;
};

export type EditorInterface ={
  operations: Operations;
  flags: Flags;
};

