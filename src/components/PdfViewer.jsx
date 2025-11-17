import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import AnnotationCanvas from './AnnotationCanvas';
import CommentsPanel from './CommentsPanel';
import NavigationControls from './NavigationControls';
import { generatePdfFingerprint, saveAnnotations, loadAnnotations } from '../utils/annotationUtils';
import { exportAnnotatedPdf } from '../utils/pdfExport';
import { v4 as uuidv4 } from 'uuid';
import './PdfViewer.css';

// Set worker source
GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js`;

const PdfViewer = ({ pdfData }) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState({});
  const [comments, setComments] = useState([]);
  const [pdfFingerprint, setPdfFingerprint] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState('rgba(255, 255, 0, 0.5)');
  const [highlighterSize, setHighlighterSize] = useState(10);
  const [images, setImages] = useState({});

  const canvasRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await pdfData.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);

        // Generate fingerprint
        const fingerprint = await generatePdfFingerprint(arrayBuffer);
        setPdfFingerprint(fingerprint);

        // Load saved annotations, comments, and images
        const savedData = loadAnnotations(fingerprint);
        setAnnotations(savedData.annotations || {});
        setComments(savedData.comments || []);
        setImages(savedData.images || {});

        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfData]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  }, [pdfDocument, currentPage, scale]);

  // Save annotations, comments, and images when they change
  useEffect(() => {
    if (pdfFingerprint) {
      saveAnnotations(pdfFingerprint, annotations, comments, images);
    }
  }, [annotations, comments, images, pdfFingerprint]);

  // Render page when it changes
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Navigation functions
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  const fitToWidth = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth - 340; // approx comments sidebar width
      const canvasWidth = canvasRef.current.width;
      if (canvasWidth > 0) {
        const newScale = containerWidth / canvasWidth;
        setScale(newScale);
      }
    }
  };

  const downloadOriginal = () => {
    const url = URL.createObjectURL(pdfData);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'original.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Annotation and comment handlers
  const handleAnnotationUpdate = (newAnnotations) => {
    setAnnotations((prev) => ({ ...prev, [currentPage]: newAnnotations }));
  };

  const handleCommentUpdate = (newComments) => {
    setComments(newComments);
  };

  const handleCommentPositionChange = (commentId, x, y) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, x, y } : comment
      )
    );
  };

  // Image handling
  const handleAddImage = async (file) => {
    try {
      const imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const newImage = {
        id: uuidv4(),
        src: imageUrl,
        x: 100,
        y: 100,
        width: Math.min(img.width, 300),
        height: 'auto',
        scale: 1,
      };

      setImages((prev) => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), newImage],
      }));
    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  const handleImageUpdate = (newImages) => {
    setImages((prev) => ({ ...prev, [currentPage]: newImages }));
  };

  const exportAnnotated = async () => {
    try {
      if (!pdfDocument) return;

      const blob = await exportAnnotatedPdf(
        pdfData,
        annotations,
        comments,
        images,
        pdfDocument
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'annotated.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting annotated PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading PDF...</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <NavigationControls
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        onPageChange={goToPage}
        onNext={nextPage}
        onPrev={prevPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToWidth={fitToWidth}
        onDownloadOriginal={downloadOriginal}
        onExportAnnotated={exportAnnotated}
        onToggleDrawing={() => setIsDrawing(!isDrawing)}
        onSetHighlighterColor={setHighlighterColor}
        onSetHighlighterSize={setHighlighterSize}
        onAddImage={handleAddImage}
        isDrawing={isDrawing}
        highlighterColor={highlighterColor}
        highlighterSize={highlighterSize}
      />

      <div className="pdf-content">
        <div className="pdf-container" ref={containerRef}>
          <div className="pdf-page">
            <canvas
              ref={canvasRef}
              className="pdf-canvas"
            />

            <AnnotationCanvas
              ref={annotationCanvasRef}
              pageNumber={currentPage}
              scale={scale}
              annotations={annotations[currentPage] || []}
              onUpdate={handleAnnotationUpdate}
              isDrawing={isDrawing}
              setIsDrawing={setIsDrawing}
              highlighterColor={highlighterColor}
              highlighterSize={highlighterSize}
              images={images[currentPage] || []}
              onImageUpdate={handleImageUpdate}
              comments={comments.filter((c) => c.pageNumber === currentPage)}
              onCommentPositionChange={handleCommentPositionChange}
            />
          </div>
        </div>

        <CommentsPanel
          comments={comments.filter((c) => c.pageNumber === currentPage)}
          onPageComments={handleCommentUpdate}
          currentPage={currentPage}
          allComments={comments}
        />
      </div>
    </div>
  );
};

export default PdfViewer;