import type { Identifiable } from "$lib/types";

export function remove<T extends Identifiable>(arr: T[], id: string) {
  return arr.filter(x => x.id !== id);
}

export function append<T extends Identifiable>(arr: T[], items: T[]): T[];
export function append<T extends Identifiable>(arr: T[], item: T): T[];
export function append<T extends Identifiable>(arr: T[], item: T | T[]): T[] {
  return [...arr, ...(Array.isArray(item) ? item : [item])];
}

export function update<T extends Identifiable>(arr: T[], item: T) {
  const index = arr.findIndex(x => x.id === item.id);
  if (index >= 0) {
    return [...arr.slice(0, index), item, ...arr.slice(index + 1)];
  }
  return arr;
}

export function defined<T>(x: T): x is (T extends (undefined | null) ? never : T) {
  return x != null;
}

export function filterEmpty<T>(arr: T[]) {
  return arr.filter(defined);
}

export function partition<T>(arr: T[], criteria: (x: T) => boolean) {
  return arr.reduce((acc, i) => (acc[criteria(i) ? 0 : 1].push(i), acc), [[], []] as [T[], T[]]);
}

export function wrap<T>(singleOrArray: T | T[]) {
  return Array.isArray(singleOrArray) ? singleOrArray : [singleOrArray];
}
