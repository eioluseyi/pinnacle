import { Ports } from '@pinnacle/shared-types';

export const DEFAULT_PORTS = {
  next: 3000,
  socket: 1234,
};

export const ports = {
  ...DEFAULT_PORTS,
};

type Listener = (ports: Ports) => void;
const portListeners = new Set<Listener>();

function notifyPortListeners() {
  const snapshot = { ...ports };
  portListeners.forEach((listener) => listener(snapshot));
}

export function onPortsChange(listener: Listener) {
  portListeners.add(listener);

  return () => {
    portListeners.delete(listener);
  };
}

export function setPorts(newPorts: Ports) {
  ports.next = newPorts.next;
  ports.socket = newPorts.socket;
  notifyPortListeners();
}
