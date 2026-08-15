import os from 'node:os';

export const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return null;
};

export const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
