import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import { DotIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Heading = () => {
  const { socket } = useSocket();
  const [numberOfScreens, setNumberOfScreens] = useState(0);

  const isScreenOnline = numberOfScreens > 0;
  const isPlural = numberOfScreens !== 1;
  const onlineLabel = (() => {
    if (isPlural) return `Screens Online (${numberOfScreens})`;
    return `Screen Online (${numberOfScreens})`;
  })();

  useEffect(() => {
    const handleDisplayStatus = (count: number) => setNumberOfScreens(count);
    socket?.on('display-status', handleDisplayStatus);

    return () => {
      socket?.off('display-status', handleDisplayStatus);
    };
  }, [socket]);

  return (
    <div className='flex justify-between items-center gap-10 pt-8 pb-6'>
      <div>
        <h1 className='mb-1 font-serif text-4xl'>Slides Control Center</h1>
        <p className='text-muted-foreground text-sm'>
          Organize, preview, and stream slides to any connected screen in real-time.
        </p>
      </div>
      <div>
        <Badge variant='outline' className='h-6 relative'>
          <DotIcon
            data-icon='inline-start'
            className={cn('text-amber-600 scale-300', { 'text-green-600': isScreenOnline })}
          />
          <DotIcon
            data-icon='inline-start'
            className={cn('absolute text-amber-600 scale-300 left-1.5', {
              'text-green-600 animate-ping': isScreenOnline,
            })}
          />
          {isScreenOnline ? onlineLabel : 'Waiting for connection'}
        </Badge>
      </div>
    </div>
  );
};
