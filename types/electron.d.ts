export {};

declare global {
  interface Window {
    electron?: {
      getLocalIp?: () => Promise<string>;
      onIpChanged: (callback: (ip: string | null) => void) => () => void;
    };
  }
}
