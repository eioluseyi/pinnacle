export {};

export type Ports = { socket: number; next: number };
export type LocalIpResponse = Promise<{ ip: string; port: Ports }>;
export type IpChangedCallback = (ip: string | null, port?: Ports) => void;

declare global {
  interface Window {
    electron?: {
      getLocalIp: () => LocalIpResponse;
      onIpChanged: (callback: IpChangedCallback) => () => void;
    };
  }
}
