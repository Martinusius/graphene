export type Transaction = {
  callback: () => void;
  resolve: () => void;
  undo?: boolean;
  redo?: boolean;
};

export type TransactionOptions = {
  undo?: boolean;
  redo?: boolean;
}