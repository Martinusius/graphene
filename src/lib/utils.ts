export function array<T = number>(size: number, value?: T): T[] {
  return Array(size).fill(value ?? 0);
}

export function repeat<T>(array: T[], count: number): T[] {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(...array);
  }
  return result;
}