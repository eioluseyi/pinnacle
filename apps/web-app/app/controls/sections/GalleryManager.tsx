import { ImageObject } from '@/app/controls/page';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import { Trash2Icon } from 'lucide-react';
import { ChangeEventHandler, Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

type GalleryManagerProps = {
  images: ImageObject[];
  setImages: Dispatch<SetStateAction<ImageObject[]>>;
  displayValue: string | null;
  setDisplayValue: Dispatch<SetStateAction<string | null>>;
  displayImage?: ImageObject;
};
export const GalleryManager = ({
  images,
  setImages,
  displayValue,
  setDisplayValue,
  displayImage,
}: GalleryManagerProps) => {
  const socket = useSocket();
  const [draggedImage, setDraggedImage] = useState<ImageObject | null>(null);

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

  const sendUpdate = useCallback(
    (payload?: ImageObject) => {
      socket.emit('update-display', payload);
    },
    [socket],
  );

  useEffect(() => {
    sendUpdate(displayImage);
  }, [displayImage, sendUpdate]);

  useEffect(() => {
    localStorage.setItem('image-order', JSON.stringify(images.map((image) => image.id)));
  }, [images]);

  return (
    <div
      role='radiogroup'
      className='grid @2xl:grid-cols-2 @5xl:grid-cols-3 @6xl:grid-cols-4 @7xl:grid-cols-5 gap-2 overflow-y-auto overflow-x-visible max-h-150 scroll-fade-y p-2'>
      {images.map((image) => (
        <label
          key={image.id}
          draggable
          onDragStart={() => handleDragStart(image)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(image)}
          className={cn(
            'group relative cursor-pointer overflow-hidden rounded outline-1 outline-offset-2 outline-transparent focus-visible:outline-sky-900 transition-colors duration-300 ease-out',
            { 'outline-primary!': image.name === displayImage?.name },
            'first:rounded-tl-4xl nth-[1]:rounded-tr-4xl @2xl:nth-[1]:rounded-tr @2xl:nth-[2]:rounded-tr-4xl @5xl:nth-[2]:rounded-tr @5xl:nth-[3]:rounded-tr-4xl @6xl:nth-[3]:rounded-tr @6xl:nth-[4]:rounded-tr-4xl @7xl:nth-[4]:rounded-tr @7xl:nth-[5]:rounded-tr-4xl',
          )}>
          <input
            id={image.name}
            className='absolute opacity-0 pointer-events-none'
            type='radio'
            name='display'
            value={image.name}
            checked={displayValue === image.name}
            onChange={() => setDisplayValue(image.name)}
          />
          <img src={image.src} alt={image.name} className='w-auto aspect-video object-contain checkered-bg ' />
          <div className='absolute bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out text-xs text-muted-foreground truncate px-1 bg-muted'>
            <small>{image.name}</small>
          </div>
          <button
            type='button'
            className='opacity-0 group-hover:opacity-100 transition-opacity top-1 right-1 absolute bg-background/70 hover:bg-primary grid place-items-center rounded-full w-5 h-5 text-foreground text-xs'
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              await deleteImage(image);
            }}>
            <Trash2Icon size={12} />
          </button>
        </label>
      ))}
    </div>
  );
};
