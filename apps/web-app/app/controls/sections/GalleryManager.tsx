import { ImageObject } from '@/app/controls/page';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import { Trash2Icon } from 'lucide-react';
import { ChangeEventHandler, Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLLabelElement>, image: ImageObject) => {
    // Set data so the drop handler knows what is being dragged
    e.dataTransfer.setData('text/plain', image.id);
    e.dataTransfer.effectAllowed = 'move';

    // Find the inner image element
    const currentImgElement = e.currentTarget.querySelector('img');
    const imgElement = document.createElement('img');
    imgElement.src = currentImgElement?.src || '';
    imgElement.classList.add('w-60', 'aspect-video', 'object-contain', 'checkered-bg', 'opacity-50');
    const wrapper = document.createElement('div');
    wrapper.classList.add('w-fit', 'isolate');
    wrapper.appendChild(imgElement);

    document.body.appendChild(wrapper);
    dragPreviewRef.current = wrapper;
    e.dataTransfer.setDragImage(wrapper, imgElement.width / 2, imgElement.height / 2);

    setDraggedImage(image);
  };

  const handleDragEnd = () => {
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
    setDraggedImage(null);
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
      className='gap-2 grid @md:grid-cols-2 @4xl:grid-cols-4 @5xl:grid-cols-5 @xl:grid-cols-3 p-2 max-h-150 overflow-x-visible overflow-y-auto scroll-fade-y'>
      {images.map((image) => (
        <label
          key={image.id}
          draggable
          onDragStart={(e) => handleDragStart(e, image)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(image)}
          className={cn(
            'group relative rounded outline-1 outline-transparent focus-visible:outline-sky-900 outline-offset-2 overflow-hidden transition-colors duration-300 ease-out cursor-pointer',
            { 'outline-primary!': image.name === displayImage?.name },
            'first:rounded-tl-4xl nth-[1]:rounded-tr-4xl @md:nth-[1]:rounded-tr @md:nth-[2]:rounded-tr-4xl @xl:nth-[2]:rounded-tr @xl:nth-[3]:rounded-tr-4xl @4xl:nth-[3]:rounded-tr @4xl:nth-[4]:rounded-tr-4xl @5xl:nth-[4]:rounded-tr @5xl:nth-[5]:rounded-tr-4xl',
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
          <img src={image.src} alt={image.name} className='w-auto object-contain aspect-video checkered-bg' />
          <div className='bottom-0 absolute bg-muted px-1 text-muted-foreground text-xs truncate transition-transform translate-y-full group-hover:translate-y-0 duration-300 ease-out'>
            <small>{image.name}</small>
          </div>
          <button
            type='button'
            className='top-1 right-1 absolute place-items-center grid bg-background/70 hover:bg-primary opacity-0 group-hover:opacity-100 rounded-full w-5 h-5 text-foreground text-xs transition-opacity'
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
