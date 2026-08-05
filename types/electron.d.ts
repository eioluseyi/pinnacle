export {};

declare global {
  interface Window {
    electron?: {
      getLocalIp?: () => Promise<string>;
    };
  }
}
