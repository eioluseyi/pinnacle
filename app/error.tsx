'use client';

import { captureException } from '@sentry/react';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className='flex flex-col justify-center items-center gap-4 p-6 min-h-full'>
      <h2 className='font-semibold text-lg'>Something went wrong</h2>
      <button type='button' className='bg-black px-4 py-2 rounded-md text-white' onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
