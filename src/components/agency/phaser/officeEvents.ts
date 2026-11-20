type Listener<T = any> = (payload: T) => void;

class SimpleEventEmitter {
  private listeners: Record<string, Listener[]> = {};

  on<T = any>(event: string, fn: Listener<T>) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off<T = any>(event: string, fn: Listener<T>) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }

  emit<T = any>(event: string, payload: T) {
    (this.listeners[event] || []).forEach((fn) => fn(payload));
  }
}

export const officeEvents = new SimpleEventEmitter();
