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
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { FolderDownIcon, LoaderCircleIcon, PlusIcon, Trash2Icon } from 'lucide-react';
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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isExternalFileDrag, setIsExternalFileDrag] = useState(false);
  const displayImage = useMemo(() => images.find((el) => el.id === displayValue), [displayValue, images]);

  const previousImage = () => {
    if (!images.length) return;

    const currentImageIndex = images.findIndex((el) => el.id === displayValue);
    const previousImageIndex = (() => {
      if (currentImageIndex === 0) return images.length - 1;
      return currentImageIndex - 1;
    })();
    setDisplayValue(images[previousImageIndex].id);
  };

  const nextImage = () => {
    if (!images.length) return;

    const currentImageIndex = images.findIndex((el) => el.id === displayValue);
    const nextImageIndex = (() => {
      if (currentImageIndex === images.length - 1) return 0;
      return currentImageIndex + 1;
    })();
    setDisplayValue(images[nextImageIndex].id);
  };

  const clearImage = () => setDisplayValue('');

  const deleteImage = async (image: ImageObject) => {
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(image),
    });

    setImages((current) => current.filter((item) => item.id !== image.id));
    if (displayValue === image.id) setDisplayValue(null);
  };

  const deleteSelectedImages = async () => {
    const selectedImages = images.filter((image) => selectedImageIds.has(image.id));
    await Promise.all(selectedImages.map(deleteImage));
    setSelectedImageIds(new Set());
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditableContent = target.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target.tagName);
      const isEditable =
        isEditableContent || (['INPUT'].includes(target.tagName) && (target as HTMLInputElement).name !== 'display');
      const isDeleteKey = e.key === 'Delete' || e.key === 'Backspace';

      if (isEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedImageIds(new Set(images.map((image) => image.id)));
        return;
      }

      if (!isDeleteKey || selectedImageIds.size === 0) return;
      e.preventDefault();
      void deleteSelectedImages();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, selectedImageIds, displayValue]);

  const importFiles = async (files: File[], target?: FileDropTarget) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const uploadPromise = Promise.all(imageFiles.map((file) => handleUpload(file, false)));
    const uploadedImages = (
      await toast.promise(uploadPromise, {
        loading: `Importing ${imageFiles.length} ${imageFiles.length === 1 ? 'image' : 'images'}...`,
        success: (results) => {
          const uploadedCount = results.filter((image): image is ImageObject => image !== null).length;
          return `${uploadedCount} ${uploadedCount === 1 ? 'image' : 'images'} imported`;
        },
        error: 'Unable to import images',
      })
    ).filter((image): image is ImageObject => image !== null);

    if (!uploadedImages.length) return;

    setImages((current) => {
      if (!target) return [...current, ...uploadedImages];

      const targetIndex = current.findIndex((image) => image.id === target.id);
      if (targetIndex === -1) return [...current, ...uploadedImages];

      const insertionIndex = target.position === 'left' ? targetIndex : targetIndex + 1;
      return [...current.slice(0, insertionIndex), ...uploadedImages, ...current.slice(insertionIndex)];
    });
  };

  const handleScreenDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;

    e.preventDefault();
    setIsExternalFileDrag(true);
  };

  const handleScreenDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsExternalFileDrag(false);
    }
  };

  const handleScreenDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.files.length) return;

    e.preventDefault();
    setIsExternalFileDrag(false);
    void importFiles(Array.from(e.dataTransfer.files));
  };

  async function handleUpload(file: File, notifyOnError = true): Promise<ImageObject | null> {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let data: { error?: string; image?: ImageObject } = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        if (!response.ok) {
          throw new Error(responseText || 'Upload failed');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (!data.image) throw new Error('Upload returned no image');

      return data.image;
    } catch (err) {
      // if (notifyOnError) {
      toast.add({ title: 'Upload failed', description: `Unable to upload ${file.name}`, type: 'error' });
      // }
      return null;
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

  useEffect(() => {
    if (!isLoadingImages) {
      localStorage.setItem('image-order', JSON.stringify(images.map((image) => image.id)));
    }
  }, [images, isLoadingImages]);

  return (
    <div
      className={cn(
        'flex flex-col mx-auto pr-6 pl-8 max-w-[1920px] h-svh overflow-hidden font-sans transition-colors ease-out',
        { 'bg-accent': isExternalFileDrag },
      )}
      onDragOver={handleScreenDragOver}
      onDragLeave={handleScreenDragLeave}
      onDrop={handleScreenDrop}>
      <Heading />
      {isLoadingImages ? (
        <LoadingState />
      ) : images.length ? (
        <div className='flex flex-1 gap-5 overflow-hidden'>
          <main className='@container z-10 relative flex flex-col flex-1 h-full max-h-full overflow-x-hidden overflow-y-auto'>
            <GalleryManager
              displayValue={displayValue}
              setDisplayValue={setDisplayValue}
              images={images}
              setImages={setImages}
              displayImage={displayImage}
              onFilesDrop={importFiles}
              deleteImage={deleteImage}
              selectedImageIds={selectedImageIds}
              setSelectedImageIds={setSelectedImageIds}
            />
            <div className='bottom-4 sticky flex justify-end items-center gap-2 pt-8 w-full pointer-events-none'>
              {selectedImageIds.size > 0 && (
                <Button
                  className='bg-destructive/30! shadow-2xl shadow-black backdrop-blur-lg border-none pointer-events-auto'
                  type='button'
                  variant='destructive'
                  size='lg'
                  onClick={deleteSelectedImages}>
                  <Trash2Icon />
                  Delete selected ({selectedImageIds.size})
                </Button>
              )}
              <Button
                className='bg-background/30 shadow-2xl shadow-black backdrop-blur-lg border-none pointer-events-auto'
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
