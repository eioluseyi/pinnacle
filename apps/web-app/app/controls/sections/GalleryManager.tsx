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
  onFilesDrop: (files: File[], target?: FileDropTarget) => void;
  deleteImage: (image: ImageObject) => Promise<void>;
  selectedImageIds: Set<string>;
  setSelectedImageIds: Dispatch<SetStateAction<Set<string>>>;
};

type DropPosition = 'left' | 'right';
export type FileDropTarget = { id: string; position: DropPosition };

export const GalleryManager = ({
  images,
  setImages,
  displayValue,
  setDisplayValue,
  displayImage,
  onFilesDrop,
  deleteImage,
  selectedImageIds,
  setSelectedImageIds,
}: GalleryManagerProps) => {
  const socket = useSocket();
  const [draggedImages, setDraggedImages] = useState<ImageObject[]>([]);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null,
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionBaseRef = useRef<Set<string>>(new Set());
  const selectionModeRef = useRef<'replace' | 'add' | 'toggle'>('replace');
  const didDragSelectRef = useRef(false);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  const handleImageSelection = (e: React.MouseEvent<HTMLLabelElement>, image: ImageObject) => {
    const isRangeSelection = e.shiftKey;
    const isToggleSelection = e.metaKey || e.ctrlKey;

    if (!isRangeSelection && !isToggleSelection) {
      e.stopPropagation();
      setSelectedImageIds(new Set());
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setSelectedImageIds((current) => {
      if (current.has(image.id)) {
        const next = new Set(current);
        next.delete(image.id);
        return next;
      }

      if (isRangeSelection) {
        const anchorIndex = images.findIndex((item) => item.id === [...selectedImageIds].at(-1));
        const imageIndex = images.findIndex((item) => item.id === image.id);

        if (anchorIndex !== -1 && imageIndex !== -1) {
          const start = Math.min(anchorIndex, imageIndex);
          const end = Math.max(anchorIndex, imageIndex);
          const newSelection = new Set(images.slice(start, end + 1).map((item) => item.id));
          return new Set([...current, ...newSelection]);
        }
      }

      if (isToggleSelection) {
        const next = new Set(current);
        if (next.has(image.id)) next.delete(image.id);
        else next.add(image.id);
        return next;
      }

      return new Set([image.id]);
    });
  };

  const handleImageMouseDown = (e: React.MouseEvent<HTMLLabelElement>, image: ImageObject) => {
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) return;

    e.preventDefault();
    e.stopPropagation();
    handleImageSelection(e, image);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLLabelElement>, image: ImageObject) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    handleImageSelection(e, image);
  };

  const handleDragStart = (e: React.DragEvent<HTMLLabelElement>, image: ImageObject) => {
    // Set data so the drop handler knows what is being dragged
    e.dataTransfer.setData('text/plain', image.id);
    e.dataTransfer.effectAllowed = 'move';

    // Find the inner image element
    const imagesToDrag = selectedImageIds.has(image.id) ? images.filter((item) => selectedImageIds.has(item.id)) : [image];
    const imgElement = document.createElement('img');
    imgElement.src = imagesToDrag[0]?.src || '';
    imgElement.classList.add('w-60', 'aspect-video', 'object-contain', 'checkered-bg', 'opacity-50');
    const wrapper = document.createElement('div');
    wrapper.classList.add('w-fit', 'isolate');
    wrapper.appendChild(imgElement);

    document.body.appendChild(wrapper);
    dragPreviewRef.current = wrapper;
    e.dataTransfer.setDragImage(wrapper, imgElement.width / 2, imgElement.height / 2);

    setDraggedImages(imagesToDrag);
  };

  const handleDragEnd = () => {
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
    setDropTarget(null);
    setDraggedImages([]);
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.files.length) {
      e.preventDefault();
      e.stopPropagation();
      const target = setDropTargetFromPoint(e.clientX, e.clientY, e.currentTarget);
      const targetImage = target && images.find((image) => image.id === target.id);

      setDropTarget(null);
      onFilesDrop(Array.from(e.dataTransfer.files), targetImage ? target : undefined);
      return;
    }

    const targetImage = dropTarget && images.find((image) => image.id === dropTarget.id);
    if (!draggedImages.length || !targetImage || draggedImages.some((image) => image.id === targetImage.id)) {
      return;
    }

    const position = dropTarget?.position ?? 'right';

    setImages((current) => {
      const draggedIds = new Set(draggedImages.map((image) => image.id));
      const removed = current.filter((image) => draggedIds.has(image.id));
      const updated = current.filter((image) => !draggedIds.has(image.id));

      const adjustedTargetIndex = updated.findIndex((image) => image.id === targetImage.id);
      const insertionIndex = position === 'left' ? adjustedTargetIndex : adjustedTargetIndex + 1;
      updated.splice(insertionIndex, 0, ...removed);
      return updated;
    });

    setDropTarget(null);
    setDraggedImages([]);
  };

  const clearSelection = () => {
    if (didDragSelectRef.current) {
      didDragSelectRef.current = false;
      return;
    }

    setSelectedImageIds(new Set());
  };

  const handleSelectionStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('label, button, input')) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    selectionStartRef.current = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
    selectionModeRef.current = e.metaKey || e.ctrlKey ? 'toggle' : e.shiftKey ? 'add' : 'replace';
    selectionBaseRef.current = e.metaKey || e.ctrlKey || e.shiftKey ? new Set(selectedImageIds) : new Set();
    setIsSelecting(true);
    setSelectionBox({ left: selectionStartRef.current.x, top: selectionStartRef.current.y, width: 0, height: 0 });
  };

  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = galleryRef.current;
      const start = selectionStartRef.current;
      if (!container || !start) return;

      const bounds = container.getBoundingClientRect();
      const current = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);
      const selectionRect = { left, top, width, height };

      setSelectionBox(selectionRect);
      if (width < 4 && height < 4) return;

      didDragSelectRef.current = true;
      const selectedIds = new Set(selectionBaseRef.current);
      container.querySelectorAll<HTMLElement>('[data-image-id]').forEach((item) => {
        const itemBounds = item.getBoundingClientRect();
        const intersects =
          itemBounds.left < bounds.left + left + width &&
          itemBounds.right > bounds.left + left &&
          itemBounds.top < bounds.top + top + height &&
          itemBounds.bottom > bounds.top + top;

        const id = item.dataset.imageId;
        if (!intersects || !id) return;

        if (selectionModeRef.current === 'toggle') {
          if (selectedIds.has(id)) selectedIds.delete(id);
          else selectedIds.add(id);
        } else {
          selectedIds.add(id);
        }
      });
      selectedIds.delete('');
      setSelectedImageIds(selectedIds);
    };

    const handleMouseUp = () => {
      setIsSelecting(false);
      setSelectionBox(null);
      selectionStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting]);

  const sendUpdate = useCallback(
    (payload?: ImageObject) => {
      socket.emit('update-display', payload);
    },
    [socket],
  );

  useEffect(() => {
    sendUpdate(displayImage);
  }, [displayImage, sendUpdate]);

  // first:rounded-tl-4xl nth-[1]:rounded-tr-4xl @md:nth-[1]:rounded-tr @md:nth-[2]:rounded-tr-4xl @xl:nth-[2]:rounded-tr @xl:nth-[3]:rounded-tr-4xl @4xl:nth-[3]:rounded-tr @4xl:nth-[4]:rounded-tr-4xl @5xl:nth-[4]:rounded-tr @5xl:nth-[5]:rounded-tr-4xl

  return (
    <div
      role='radiogroup'
      ref={galleryRef}
      className='relative flex-1 content-start gap-2 grid @md:grid-cols-2 @4xl:grid-cols-4 @5xl:grid-cols-5 @xl:grid-cols-3 p-2'
      onMouseDown={handleSelectionStart}
      onClick={clearSelection}
      onDragOver={handleGridDragOver}
      onDrop={handleDrop}>
      {selectionBox && (
        <span
          aria-hidden='true'
          className='z-20 absolute bg-primary/15 border border-primary pointer-events-none'
          style={selectionBox}
        />
      )}
      {images.map((image) => (
        <div key={image.id} className='relative' data-image-id={image.id}>
          <label
            draggable
            onDragStart={(e) => handleDragStart(e, image)}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => handleImageMouseDown(e, image)}
            onClick={(e) => handleImageClick(e, image)}
            className={cn(
              'group block relative rounded outline-1 outline-transparent focus-visible:outline-sky-900 outline-offset-2 overflow-hidden transition-colors duration-300 ease-out cursor-pointer',
              { 'outline-primary!': image.name === displayImage?.name },
              { 'outline-2! outline-primary!': selectedImageIds.has(image.id) },
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
