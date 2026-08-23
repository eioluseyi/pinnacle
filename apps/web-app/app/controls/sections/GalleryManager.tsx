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

type DropPosition = 'left' | 'right';

export const GalleryManager = ({
  images,
  setImages,
  displayValue,
  setDisplayValue,
  displayImage,
}: GalleryManagerProps) => {
  const socket = useSocket();
  const [draggedImage, setDraggedImage] = useState<ImageObject | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLLabelElement>, image: ImageObject) => {
    // Set data so the drop handler knows what is being dragged
    e.dataTransfer.setData('text/plain', image.id);
    e.dataTransfer.effectAllowed = 'move';

    // Find the inner image element
    const imgElement = document.createElement('img');
    imgElement.src = image?.src || '';
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
    setDropTarget(null);
    setDraggedImage(null);
  };

  const setDropTargetFromPoint = (
    clientX: number,
    clientY: number,
    container: HTMLElement,
  ): { id: string; position: DropPosition } | null => {
    const labels = Array.from(container.querySelectorAll<HTMLLabelElement>('[data-image-id]'));
    const nearestLabel = labels.reduce<{ label: HTMLLabelElement; distance: number } | null>((nearest, label) => {
      const rect = label.getBoundingClientRect();
      const horizontalDistance = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const verticalDistance = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const distance = horizontalDistance ** 2 + verticalDistance ** 2;

      if (!nearest || distance < nearest.distance) {
        return { label, distance };
      }

      return nearest;
    }, null);

    if (!nearestLabel) return null;

    const rect = nearestLabel.label.getBoundingClientRect();
    const position = clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    const id = nearestLabel.label.dataset.imageId;

    if (!id) return null;

    setDropTarget({ id, position });
    return { id, position };
  };

  const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropTargetFromPoint(e.clientX, e.clientY, e.currentTarget);
  };

  const handleDrop = (targetImage: ImageObject, position = dropTarget?.position ?? 'right') => {
    if (!draggedImage || draggedImage.id === targetImage.id) {
      return;
    }

    setImages((current) => {
      const fromIndex = current.findIndex((image) => image.id === draggedImage.id);
      const updated = [...current];
      const [removed] = updated.splice(fromIndex, 1);

      const adjustedTargetIndex = updated.findIndex((image) => image.id === targetImage.id);
      const insertionIndex = position === 'left' ? adjustedTargetIndex : adjustedTargetIndex + 1;
      updated.splice(insertionIndex, 0, removed);
      return updated;
    });

    setDropTarget(null);
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

  // first:rounded-tl-4xl nth-[1]:rounded-tr-4xl @md:nth-[1]:rounded-tr @md:nth-[2]:rounded-tr-4xl @xl:nth-[2]:rounded-tr @xl:nth-[3]:rounded-tr-4xl @4xl:nth-[3]:rounded-tr @4xl:nth-[4]:rounded-tr-4xl @5xl:nth-[4]:rounded-tr @5xl:nth-[5]:rounded-tr-4xl

  return (
    <div
      role='radiogroup'
      className='gap-2 grid @md:grid-cols-2 @4xl:grid-cols-4 @5xl:grid-cols-5 @xl:grid-cols-3 p-2 max-h-150 overflow-x-visible overflow-y-auto scroll-fade-y'
      onDragOver={handleGridDragOver}
      onDrop={(e) => {
        const target = setDropTargetFromPoint(e.clientX, e.clientY, e.currentTarget);
        const targetImage = target && images.find((image) => image.id === target.id);

        if (targetImage) handleDrop(targetImage, target.position);
      }}>
      {images.map((image) => (
        <div key={image.id} className='relative' data-image-id={image.id}>
          <label
            key={image.id}
            draggable
            onDragStart={(e) => handleDragStart(e, image)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group block relative rounded outline-1 outline-transparent focus-visible:outline-sky-900 outline-offset-2 overflow-hidden transition-colors duration-300 ease-out cursor-pointer',
              { 'outline-primary!': image.name === displayImage?.name },
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
          {dropTarget?.id === image.id && (
            <span
              aria-hidden='true'
              className={cn(
                'top-0 bottom-0 z-10 absolute bg-primary w-0.5 pointer-events-none',
                dropTarget.position === 'left' ? '-left-1.25' : '-right-1.25',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
