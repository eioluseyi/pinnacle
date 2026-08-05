/* eslint-disable @next/next/no-img-element */
'use client';
import { useIpAddress } from '@/hooks/useIpAddress';
import { useSocket } from '@/hooks/useSocket';
import classNames from 'classnames';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from 'react';

export type ImageObject = {
  id: string;
  name: string;
  src: string;
};
export default function Home() {
  const socket = useSocket();
  const [images, setImages] = useState<ImageObject[]>([]);
  const [draggedImage, setDraggedImage] = useState<ImageObject | null>(null);
  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const displayImage = useMemo(() => images.find((el) => el.name === displayValue), [displayValue, images]);
  const { ipAddress } = useIpAddress();

  const handleDragStart = (image: ImageObject) => {
    setDraggedImage(image);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetImage: ImageObject) => {
    if (!draggedImage || draggedImage.id === targetImage.id) {
      return;
    }

    setImages((current) => {
      const fromIndex = current.findIndex((image) => image.id === draggedImage.id);

      const toIndex = current.findIndex((image) => image.id === targetImage.id);

      const updated = [...current];

      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);

      return updated;
    });

    setDraggedImage(null);
  };

  const loadImages = useCallback(async () => {
    const response = await fetch('/api/upload');
    const serverImages: ImageObject[] = await response.json();

    const savedOrder = JSON.parse(localStorage.getItem('image-order') || '[]');

    const ordered = savedOrder.length
      ? savedOrder.map((id: string) => serverImages.find((image) => image.id === id)).filter(Boolean)
      : serverImages;

    return ordered as ImageObject[];
  }, []);

  const deleteImage = useCallback(
    async (image: ImageObject) => {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(image),
      });

      setImages((current) => current.filter((img) => img.src !== image.src));

      if (displayValue === image.name) {
        setDisplayValue(null);
      }
    },
    [displayValue],
  );

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

      console.log('Uploaded:', data.url);
      return data.url as string;
    } catch (err) {
      console.error(err, file.name);
      return '';
    }
  }

  const sendUpdate = useCallback(
    (payload?: ImageObject) => {
      socket.emit('update-display', payload);
    },
    [socket],
  );

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

  useEffect(() => {
    sendUpdate(displayImage);
  }, [displayImage, sendUpdate]);

  useEffect(() => {
    (async () => {
      const data = await loadImages();
      setImages(data);
    })();
  }, [loadImages]);

  useEffect(() => {
    localStorage.setItem('image-order', JSON.stringify(images.map((image) => image.id)));
  }, [images]);

  return (
    <div className='flex-1 bg-zinc-50 font-sans dark:bg-black p-10'>
      <h1 className='text-4xl font-bold text-center w-full mb-1'>Control Panel</h1>
      <p className='text-center w-full font-bold mb-10'>{ipAddress}</p>
      <div className='flex max-w-6xl mx-auto gap-4'>
        <main className='grid flex-1 gap-10 h-full'>
          <h2 className='text-2xl font-bold'>Image control</h2>
          <input
            className='cursor-pointer outline outline-dashed outline-zinc-600 -outline-offset-2 rounded px-8 py-12'
            type='file'
            name='images'
            placeholder='Click to select or Drop Image(s) here...'
            accept='image/*'
            multiple
            onChange={handleImageSelection}
          />
          <div role='radiogroup' className='flex flex-wrap gap-2 mt-20'>
            {images.map((image) => (
              <label
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(image)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(image)}
                className={classNames(
                  'relative cursor-pointer overflow-hidden rounded outline-4 outline-transparent focus-visible:outline-sky-900 transition-colors duration-300 ease-out fo',
                  image.name === displayImage?.name && 'outline-sky-600!',
                )}>
                <input
                  id={image.name}
                  className='pointer-events-none opacity-0 absolute'
                  type='radio'
                  name='display'
                  value={image.name}
                  onChange={() => setDisplayValue(image.name)}
                />
                <img src={image.src} alt={image.name} className='object-cover w-auto h-16' />
                <button
                  type='button'
                  className='absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs hover:bg-red-600'
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    await deleteImage(image);
                  }}>
                  ×
                </button>
              </label>
            ))}
          </div>
        </main>
        <aside className='grid gap-10 h-full w-80'>
          <h2 className='text-2xl font-bold'>Display</h2>
          <div className='grid gap-8'>
            {displayImage && (
              <>
                <img
                  src={displayImage?.src || ''}
                  alt={displayImage?.name || ''}
                  className='object-cover w-full h-auto rounded'
                />
                <div className='flex gap-10 justify-between max-w-40 mx-auto'>
                  <button
                    className='rounded-full bg-zinc-100 w-7 h-7 grid place-items-center cursor-pointer hover:bg-zinc-300 transition-colors duration-300 ease-out'
                    onClick={previousImage}>
                    <ArrowLeftIcon className='text-background' />
                  </button>
                  <button
                    className='rounded-full bg-zinc-100 w-7 h-7 grid place-items-center cursor-pointer hover:bg-zinc-300 transition-colors duration-300 ease-out'
                    onClick={nextImage}>
                    <ArrowRightIcon className='text-background' />
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
