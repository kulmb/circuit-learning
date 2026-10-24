import { CircuitError } from './errors';

export class UnionFind {
  private readonly parent = new Map<string, string>();
  private readonly rank = new Map<string, number>();

  add(value: string): void {
    if (!this.parent.has(value)) {
      this.parent.set(value, value);
      this.rank.set(value, 0);
    }
  }

  find(value: string): string {
    const parent = this.parent.get(value);
    if (parent === undefined) {
      throw new CircuitError('invalid_circuit', `Unknown union-find value: ${value}`);
    }
    if (parent === value) {
      return value;
    }

    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);

    if (leftRoot === rightRoot) {
      return;
    }

    const leftRank = this.rank.get(leftRoot) ?? 0;
    const rightRank = this.rank.get(rightRoot) ?? 0;

    if (leftRank < rightRank) {
      this.parent.set(leftRoot, rightRoot);
      return;
    }

    if (leftRank > rightRank) {
      this.parent.set(rightRoot, leftRoot);
      return;
    }

    this.parent.set(rightRoot, leftRoot);
    this.rank.set(leftRoot, leftRank + 1);
  }
}
