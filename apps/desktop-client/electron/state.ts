type StateUpdater<T> = T | ((previous: T) => T);
type StateListener<T> = (nextValue: T, previousValue: T) => void;

class StateStore<T = Record<string, unknown>> {
  private listeners = new Set<StateListener<T>>();
  private _value: T;

  constructor(initialState: T | (() => T)) {
    this._value = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
  }

  getState(): T {
    return this._value;
  }

  setState(nextState: StateUpdater<T>): T {
    const previousValue = this._value;
    const newValue = typeof nextState === 'function' ? (nextState as (previous: T) => T)(previousValue) : nextState;

    if (Object.is(previousValue, newValue)) {
      return this._value;
    }

    this._value = newValue;

    for (const listener of this.listeners) {
      listener(this._value, previousValue);
    }

    return this._value;
  }

  update(updater: (previous: T) => T): T {
    return this.setState(updater);
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(nextState?: T | (() => T)): T {
    return this.setState(typeof nextState === 'undefined' ? this._value : nextState);
  }

  snapshot(): T {
    return this.getState();
  }

  get value(): T {
    return this.getState();
  }

  set value(nextState: T) {
    this.setState(nextState);
  }
}

export const createState = <T>(initialState: T | (() => T)): StateStore<T> => {
  return new StateStore(initialState);
};
