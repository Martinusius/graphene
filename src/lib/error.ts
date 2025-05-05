export function alertError(error: string) {
  alert(`Error: ${error}`);
  throw new Error(error);
}