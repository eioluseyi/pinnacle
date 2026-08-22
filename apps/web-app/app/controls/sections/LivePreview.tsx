import { ImageObject } from '@/app/controls/page';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon, ArrowRightIcon, MonitorCheckIcon, MonitorDotIcon, MonitorOffIcon } from 'lucide-react';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

const EmptyState = () => {
  return (
    <Card className='py-13.5'>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='default'>
            <MonitorCheckIcon className='size-12' />
          </EmptyMedia>
          <EmptyTitle>Ready to Present</EmptyTitle>
          <EmptyDescription>Click any slide on the left to display it live.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
};

type LivePreviewProps = {
  displayImage?: ImageObject;
  previousImage?: () => void;
  nextImage?: () => void;
  clearImage?: () => void;
};

export const LivePreview = ({ displayImage, nextImage, previousImage, clearImage }: LivePreviewProps) => {
  if (!displayImage) return <EmptyState />;

  return (
    <Card className='pt-0'>
      <img
        src={displayImage?.src || ''}
        alt={displayImage?.name || ''}
        className='aspect-video w-full object-contain checkered-bg'
      />
      <CardHeader>
        <CardTitle className='text-sm truncate text-center'>{displayImage?.name || ''}</CardTitle>
      </CardHeader>
      <CardFooter>
        <ButtonGroup className='mx-auto'>
          <Button variant='outline' onClick={previousImage}>
            <ArrowLeftIcon data-icon='inline-start' />
            Prev
          </Button>
          <Button variant='outline' size='icon' onClick={clearImage}>
            <MonitorOffIcon />
          </Button>
          <Button variant='outline' onClick={nextImage}>
            Next <ArrowRightIcon data-icon='inline-end' />
          </Button>
        </ButtonGroup>
      </CardFooter>
    </Card>
  );
};
