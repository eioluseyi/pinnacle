export {};

declare global {
  interface Window {
    electron?: {
      getLocalIp: () => Promise<{ ip: string; port: { socket: string; next: string } }>;
      onIpChanged: (
        callback: (ip: string | null, port: { socket: string | null; next: string | null } | null) => void,
      ) => () => void;
    };
  }
}
