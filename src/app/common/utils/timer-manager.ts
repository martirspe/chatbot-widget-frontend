export class TimerManager {
  private timers: { [key: string]: number } = {};

  set(name: string, fn: () => void, ms: number): void {
    this.clear(name);
    this.timers[name] = window.setTimeout(fn, ms);
  }

  clear(name: string): void {
    if (this.timers[name]) {
      clearTimeout(this.timers[name]);
      delete this.timers[name];
    }
  }

  clearAll(): void {
    Object.keys(this.timers).forEach(name => this.clear(name));
  }
}
