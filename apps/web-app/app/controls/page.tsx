/* eslint-disable @next/next/no-img-element */
'use client';

import { GalleryManager } from '@/app/controls/sections/GalleryManager';
import { Heading } from '@/app/controls/sections/Heading';
import { LivePreview } from '@/app/controls/sections/LivePreview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Empty, EmptyTitle, EmptyMedia, EmptyHeader, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import { Separator } from '@/components/ui/separator';
import { FolderDownIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react';
import { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from 'react';

const EmptyState = ({ action }: { action?: () => void }) => {
  return (
    <Card className='py-10'>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='default'>
            <FolderDownIcon className='size-12' />
          </EmptyMedia>
          <EmptyTitle>Get Started</EmptyTitle>
          <EmptyDescription>Import images to begin streaming.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={action}>Import</Button>
        </EmptyContent>
      </Empty>
    </Card>
  );
};

const LoadingState = () => {
  return (
    <div className='grid flex-1 place-items-center'>
      <Marker role='status' className='w-fit -translate-y-20'>
        <MarkerIcon>
          <LoaderCircleIcon className='animate-spin' />
        </MarkerIcon>
        <MarkerContent className='shimmer'>Thinking...</MarkerContent>
      </Marker>
    </div>
  );
};

export type ImageObject = {
  id: string;
  name: string;
  src: string;
};
export default function Dashboard() {
  const [images, setImages] = useState<ImageObject[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const displayImage = useMemo(() => images.find((el) => el.name === displayValue), [displayValue, images]);

  const previousImage = () => {
    if (!images.length) return;

    const currentImageIndex = images.findIndex((el) => el.name === displayValue);
    const previousImageIndex = (() => {
      if (currentImageIndex === 0) return images.length - 1;
      return currentImageIndex - 1;
    })();
    setDisplayValue(images[previousImageIndex].name);
  };

  const nextImage = () => {
    if (!images.length) return;

    const currentImageIndex = images.findIndex((el) => el.name === displayValue);
    const nextImageIndex = (() => {
      if (currentImageIndex === images.length - 1) return 0;
      return currentImageIndex + 1;
    })();
    setDisplayValue(images[nextImageIndex].name);
  };

  const clearImage = () => setDisplayValue('');

  async function handleUpload(file: File) {
    if (!file) return '';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      return data.image?.src as string;
    } catch (err) {
      console.error(err, file.name);
      return '';
    }
  }

  const handleImageSelection: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = async (e) => {
    e.preventDefault();

    const filesObject = e.target.files;
    if (!filesObject) return;

    const files = Array.from(filesObject);
    if (files) {
      const imageObjects = await Promise.all(
        files.map(async (file) => {
          const src = await handleUpload(file);

          return {
            id: file.name,
            name: file.name,
            src,
          };
        }),
      );

      setImages((current) => [...current, ...imageObjects]);
    }
  };

  const selectImageFile = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.onchange = handleImageSelection as unknown as typeof fileInput.onchange;
    fileInput.click();
  };

  const loadImages = useCallback(async () => {
    const response = await fetch('/api/upload');
    const serverImages: ImageObject[] = await response.json();

    const savedOrder = JSON.parse(localStorage.getItem('image-order') || '[]');

    const ordered = (() => {
      if (!savedOrder.length) return serverImages;

      const byId = new Map(serverImages.map((img) => [img.id, img]));

      // Include images in the saved order if they still exist on the server
      const orderedFromSaved = savedOrder.map((id: string) => byId.get(id)).filter(Boolean) as ImageObject[];

      // Append any server images that weren't present in the saved order
      const remaining = serverImages.filter((img) => !savedOrder.includes(img.id));

      return [...orderedFromSaved, ...remaining];
    })();

    return ordered as ImageObject[];
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoadingImages(true);

      try {
        const data = await loadImages();
        setImages(data);
      } finally {
        setIsLoadingImages(false);
      }
    })();
  }, [loadImages]);

  return (
    <div className='flex flex-col mx-auto pr-6 pl-12 max-w-[1920px] h-svh font-sans overflow-hidden'>
      <Heading />
      {isLoadingImages ? (
        <LoadingState />
      ) : images.length ? (
        <div className='flex flex-1 gap-5 overflow-hidden'>
          <main className='@container relative z-10 flex-1 h-full max-h-full overflow-y-auto overflow-x-hidden'>
            <GalleryManager
              displayValue={displayValue}
              setDisplayValue={setDisplayValue}
              images={images}
              setImages={setImages}
              displayImage={displayImage}
            />
            <div className='sticky bottom-4 flex w-full justify-end pt-8 pointer-events-none'>
              <Button
                className='backdrop-blur-lg shadow-2xl shadow-black pointer-events-auto'
                variant='ghost'
                size='lg'
                onClick={selectImageFile}>
                <PlusIcon />
                Import
              </Button>
            </div>
          </main>
          <aside className='relative flex-1 w-full max-w-sm h-fit pt-2'>
            <Separator
              className='absolute h-full w-0.5! -left-3.75 bg-transparent bg-linear-to-b from-5% to-95% from-transparent via-border to-transparent'
              orientation='vertical'
            />
            <LivePreview
              displayImage={displayImage}
              nextImage={nextImage}
              previousImage={previousImage}
              clearImage={clearImage}
            />
          </aside>
        </div>
      ) : (
        <EmptyState action={selectImageFile} />
      )}
    </div>
  );
}
