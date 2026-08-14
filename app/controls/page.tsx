/* eslint-disable @next/next/no-img-element */
'use client';
import { useIpAddress } from '@/hooks/useIpAddress';
import { useSocket } from '@/hooks/useSocket';
import classNames from 'classnames';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { ChangeEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const { ipAddress, portNumber } = useIpAddress();
  const [ipChanged, setIpChanged] = useState(false);
  const isFirstIp = useRef(true);

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

      return data.image?.src as string;
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

  useEffect(() => {
    const RESET_DELAY = 3_000;
    let windowTimer: ReturnType<typeof setTimeout> | undefined;
    const createResetTimer = () => setTimeout(() => setIpChanged(false), RESET_DELAY);

    if (ipAddress === '0.0.0.0' && portNumber === '3000') return;
    if (isFirstIp.current) {
      isFirstIp.current = false;
      return;
    }

    setIpChanged(true);

    if (typeof window !== 'undefined' && !window.document.hasFocus()) {
      const handleFocus = () => {
        windowTimer = createResetTimer();
      };

      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
        if (windowTimer) clearTimeout(windowTimer);
      };
    }

    const timer = createResetTimer();
    return () => {
      clearTimeout(timer);
      if (windowTimer) clearTimeout(windowTimer);
    };
  }, [ipAddress, portNumber]);

  return (
    <div className='flex-1 bg-zinc-50 dark:bg-black p-10 font-sans'>
      <h1 className='mb-1 w-full font-bold text-4xl text-center'>Control Panel</h1>
      <p className='relative mx-auto mb-10 w-fit font-bold text-center'>
        <span>
          {ipAddress}:{portNumber}
        </span>
        <span
          className={classNames(
            'absolute block inset-y-0 h-fit left-full ml-2 text-xs text-amber-200 transition-opacity duration-300 rounded-full bg-amber-700 px-2 my-auto',
            { 'opacity-0': !ipChanged },
          )}>
          Updated
        </span>
      </p>
      <div className='flex gap-4 mx-auto max-w-6xl'>
        <main className='flex-1 gap-10 grid h-full'>
          <h2 className='font-bold text-2xl'>Image control</h2>
          <input
            className='px-8 py-12 rounded outline outline-dashed outline-zinc-600 -outline-offset-2 cursor-pointer'
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
                  className='absolute opacity-0 pointer-events-none'
                  type='radio'
                  name='display'
                  value={image.name}
                  onChange={() => setDisplayValue(image.name)}
                />
                <img src={image.src} alt={image.name} className='w-auto h-16 object-cover' />
                <button
                  type='button'
                  className='top-1 right-1 absolute bg-black/70 hover:bg-red-600 rounded-full w-5 h-5 text-white text-xs'
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
        <aside className='gap-10 grid w-80 h-full'>
          <h2 className='font-bold text-2xl'>Display</h2>
          <div className='gap-8 grid'>
            {displayImage && (
              <>
                <img
                  src={displayImage?.src || ''}
                  alt={displayImage?.name || ''}
                  className='rounded w-full h-auto object-cover'
                />
                <div className='flex justify-between gap-10 mx-auto max-w-40'>
                  <button
                    className='place-items-center grid bg-zinc-100 hover:bg-zinc-300 rounded-full w-7 h-7 transition-colors duration-300 ease-out cursor-pointer'
                    onClick={previousImage}>
                    <ArrowLeftIcon className='text-background' />
                  </button>
                  <button
                    className='place-items-center grid bg-zinc-100 hover:bg-zinc-300 rounded-full w-7 h-7 transition-colors duration-300 ease-out cursor-pointer'
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
