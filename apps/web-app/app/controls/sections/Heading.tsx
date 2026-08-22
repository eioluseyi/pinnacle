import { Badge } from '@/components/ui/badge';
import { DotIcon } from 'lucide-react';

export const Heading = () => {
  return (
    <div className='flex items-center gap-10 justify-between pt-8 pb-6'>
      <div>
        <h1 className='font-serif text-4xl mb-1'>Slides Control Center</h1>
        <p className='text-sm text-muted-foreground'>
          Organize, preview, and stream slides to any connected screen in real-time.
        </p>
      </div>
      <div>
        <Badge variant='outline' className='h-6'>
          <DotIcon data-icon='inline-start' className='scale-300 text-green-600' /> Screen Online
        </Badge>
      </div>
    </div>
  );
};
