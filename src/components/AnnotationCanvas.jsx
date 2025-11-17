import React, { useRef, useEffect, useCallback } from 'react';

const ResizeHandle = ({ onResize }) => {
  return (
    <div
      style={{
        position: 'absolute',
        right: -8,
        bottom: -8,
        width: 16,
        height: 16,
        background: '#4285f4',
        borderRadius: '50%',
        cursor: 'nwse-resize',
        border: '2px solid white',
        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onResize(e);
      }}
    />
  );
};

const AnnotationCanvas = React.forwardRef(({ 
  pageNumber, 
  scale, 
  annotations = [], 
  onUpdate, 
  isDrawing, 
  setIsDrawing,
  highlighterColor = 'rgba(255, 255, 0, 0.5)',
  highlighterSize = 10,
  images: propImages = [],
  onImageUpdate,
  comments = [],
  onCommentPositionChange,
}, ref) => {
  const canvasRef = useRef(null);
  const [isDrawingActive, setIsDrawingActive] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState([]);
  const [isErasing, setIsErasing] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);

  // Ensure images is always an array
  const images = Array.isArray(propImages) ? propImages : [];

  // Update eraser state when highlighterColor changes
  useEffect(() => {
    setIsErasing(highlighterColor === 'eraser');
  }, [highlighterColor]);

  // Draw existing annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size to match PDF canvas
    const pdfCanvas = document.querySelector('.pdf-canvas');
    if (pdfCanvas) {
      canvas.width = pdfCanvas.width;
      canvas.height = pdfCanvas.height;
    }

    // Draw existing annotations
    annotations.forEach(annotation => {
      if (annotation.type === 'highlight' && annotation.points && annotation.points.length > 0) {
        ctx.strokeStyle = annotation.color || 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = annotation.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
        for (let i = 1; i < annotation.points.length; i++) {
          ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
        ctx.stroke();
      }
    });
  }, [annotations, scale]);

  const startDrawing = useCallback((e) => {
    if (!isDrawing || isResizing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    setIsDrawingActive(true);
    setCurrentPath([{ x, y }]);
  }, [isDrawing, isResizing]);

  const draw = useCallback((e) => {
    if (!isDrawingActive || isResizing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    setCurrentPath(prev => [...prev, { x, y }]);

    // Draw current stroke
    const ctx = canvas.getContext('2d');
    if (isErasing) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.strokeStyle = highlighterColor;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.lineWidth = highlighterSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentPath.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [isDrawingActive, isErasing, currentPath, highlighterColor, highlighterSize, isResizing]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingActive) return;

    if (currentPath.length > 1) {
      if (isErasing) {
        // Handle erasing annotations if needed
        const updatedAnnotations = annotations.filter(annotation => {
          if (annotation.type !== 'highlight' || !annotation.points) return true;
          
          // Check if any point in the current path is close to the annotation
          return !currentPath.some(point => 
            annotation.points.some(annPoint => {
              const dx = point.x - annPoint.x;
              const dy = point.y - annPoint.y;
              return Math.sqrt(dx * dx + dy * dy) < highlighterSize * 2;
            })
          );
        });

        onUpdate(updatedAnnotations);
      } else {
        // Add new highlight annotation
        const newAnnotation = {
          id: Date.now(),
          type: 'highlight',
          points: [...currentPath],
          color: highlighterColor,
          size: highlighterSize,
          timestamp: new Date().toISOString()
        };

        onUpdate([...annotations, newAnnotation]);
      }
    }

    setIsDrawingActive(false);
    setCurrentPath([]);
  }, [isDrawingActive, isErasing, currentPath, annotations, highlighterColor, highlighterSize, onUpdate]);

  const handleCommentMouseDown = useCallback((e, comment) => {
    if (!onCommentPositionChange) return;

    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = comment.x || 0;
    const startTop = comment.y || 0;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const newX = startLeft + dx;
      const newY = startTop + dy;

      onCommentPositionChange(comment.id, newX, newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp, { once: true });
  }, [onCommentPositionChange]);

  const handleImageMouseDown = useCallback((e, imageId, isResizeHandle = false) => {
    if (isErasing && !isResizeHandle) {
      onImageUpdate(images.filter(img => img.id !== imageId));
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = e.currentTarget.offsetLeft;
    const startTop = e.currentTarget.offsetTop;
    const startWidth = parseFloat(e.currentTarget.style.width);
    const startHeight = parseFloat(e.currentTarget.style.height);
    const aspectRatio = startWidth / startHeight;

    const handleMouseMove = (e) => {
      if (isResizeHandle) {
        const newWidth = Math.max(20, startWidth + (e.clientX - startX));
        const newHeight = newWidth / aspectRatio;
        
        onImageUpdate(images.map(img => 
          img.id === imageId 
            ? { 
                ...img, 
                width: newWidth,
                height: newHeight
              } 
            : img
        ));
      } else {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        onImageUpdate(images.map(img => 
          img.id === imageId 
            ? { 
                ...img, 
                x: startLeft + dx, 
                y: startTop + dy 
              } 
            : img
        ));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (isResizeHandle) {
      setIsResizing(true);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp, { once: true });
  }, [isErasing, images, onImageUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: (isDrawing || isErasing) 
            ? (isErasing 
              ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M21 4H8l-7 8 6 7 12-12-7-3z\'/%3E%3Cline x1=\'18\' y1=\'13\' x2=\'12\' y2=\'19\'/%3E%3Cline x1=\'15\' y1=\'16\' x2=\'9\' y2=\'10\'/%3E%3C/svg%3E") 0 24, auto' 
              : 'crosshair') 
            : 'default',
          pointerEvents: (isDrawing || isErasing) ? 'auto' : 'none'
        }}
      />
      
      {images.map(image => (
        <div
          key={image.id}
          style={{
            position: 'absolute',
            left: `${image.x}px`,
            top: `${image.y}px`,
            width: `${image.width}px`,
            height: image.height === 'auto' ? 'auto' : `${image.height}px`,
            cursor: isResizing ? 'nwse-resize' : 'move',
            transform: `scale(${image.scale || 1})`,
            transformOrigin: 'top left',
            zIndex: 5,
          }}
          onMouseDown={(e) => handleImageMouseDown(e, image.id, false)}
        >
          <img
            src={image.src}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              pointerEvents: 'none',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            alt="PDF annotation"
            draggable={false}
          />
          <ResizeHandle
            onResize={(e) => handleImageMouseDown(e, image.id, true)}
          />
        </div>
      ))}
      {comments.map((comment) => (
        <div
          key={comment.id}
          onMouseDown={(e) => handleCommentMouseDown(e, comment)}
          style={{
            position: 'absolute',
            left: `${comment.x || 0}px`,
            top: `${comment.y || 0}px`,
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 193, 7, 0.95)',
            border: '2px solid #fff',
            boxShadow: '0 0 3px rgba(0,0,0,0.5)',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#000',
            zIndex: 6,
          }}
          title={comment.text}
        >
          💬
        </div>
      ))}
    </>
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';

export default AnnotationCanvas;
