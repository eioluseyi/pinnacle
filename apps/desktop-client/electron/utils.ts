export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const delay = (ms: number | undefined) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
