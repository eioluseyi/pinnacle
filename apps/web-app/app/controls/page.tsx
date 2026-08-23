/* eslint-disable @next/next/no-img-element */
'use client';

import { GalleryManager } from '@/app/controls/sections/GalleryManager';
import type { FileDropTarget } from '@/app/controls/sections/GalleryManager';
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
    <div className='flex-1 place-items-center grid'>
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

  const importFiles = async (files: File[], target?: FileDropTarget) => {
    const imageObjects = await Promise.all(
      files
        .filter((file) => file.type.startsWith('image/'))
        .map(async (file) => ({
          id: file.name,
          name: file.name,
          src: await handleUpload(file),
        })),
    );

    if (!imageObjects.length) return;

    setImages((current) => {
      if (!target) return [...current, ...imageObjects];

      const targetIndex = current.findIndex((image) => image.id === target.id);
      if (targetIndex === -1) return [...current, ...imageObjects];

      const insertionIndex = target.position === 'left' ? targetIndex : targetIndex + 1;
      return [...current.slice(0, insertionIndex), ...imageObjects, ...current.slice(insertionIndex)];
    });
  };

  const handleScreenDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  };

  const handleScreenDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.files.length) return;

    e.preventDefault();
    void importFiles(Array.from(e.dataTransfer.files));
  };

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
    if (files) void importFiles(files);
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
    <div
      className='flex flex-col mx-auto pr-6 pl-8 max-w-[1920px] h-svh overflow-hidden font-sans'
      onDragOver={handleScreenDragOver}
      onDrop={handleScreenDrop}>
      <Heading />
      {isLoadingImages ? (
        <LoadingState />
      ) : images.length ? (
        <div className='flex flex-1 gap-5 overflow-hidden'>
          <main className='@container z-10 relative flex-1 h-full max-h-full overflow-x-hidden overflow-y-auto'>
            <GalleryManager
              displayValue={displayValue}
              setDisplayValue={setDisplayValue}
              images={images}
              setImages={setImages}
              displayImage={displayImage}
              onFilesDrop={importFiles}
            />
            <div className='bottom-4 sticky flex justify-end pt-8 w-full pointer-events-none'>
              <Button
                className='shadow-2xl shadow-black backdrop-blur-lg pointer-events-auto'
                variant='ghost'
                size='lg'
                onClick={selectImageFile}>
                <PlusIcon />
                Import
              </Button>
            </div>
          </main>
          <aside className='relative flex-1 pt-2 w-full max-w-sm h-fit'>
            <Separator
              className='-left-3.75 absolute bg-transparent bg-linear-to-b from-5% from-transparent to-95% to-transparent via-border w-0.5! h-full'
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
