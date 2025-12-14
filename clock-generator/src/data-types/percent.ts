export class Percentage {
readonly value: number;
  readonly normalized: number;

  static readonly ZERO = new Percentage(0.0);
  static readonly HUNDRED = new Percentage(100.0);
  static readonly FIFTY = new Percentage(50.0);

  constructor(value: number) {
    this.value = value;
    this.normalized = value / 100.0;
  }

  get inverse(): Percentage {
    return new Percentage(100.0 - this.value);
  }

  public times(value: number): number {
    return this.normalized * value;
  }

  public minus(percentage: Percentage): Percentage {
    return new Percentage(this.value - percentage.value);
  }

  public plus(percentage: Percentage): Percentage {
    return new Percentage(this.value + percentage.value);
  }

  public div(other: number): Percentage {
    return new Percentage(this.value / other);
  }

  public compareTo(other: Percentage): number {
    if (this.value < other.value) return -1;
    if (this.value > other.value) return 1;
    return 0;
  }

  public isNaN(): boolean {
    return Number.isNaN(this.value);
  }

  public toString(): string {
    return `Percentage(value = ${this.value})`;
  }
}
