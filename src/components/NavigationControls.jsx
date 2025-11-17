import React, { useRef, useState } from 'react';
import { FaImage } from 'react-icons/fa';
import './NavigationControls.css';

const HIGHLIGHTER_COLORS = [
  { name: 'Yellow', value: 'rgba(255, 255, 0, 0.5)' },
  { name: 'Pink', value: 'rgba(255, 100, 100, 0.5)' },
  { name: 'Green', value: 'rgba(100, 255, 100, 0.5)' },
  { name: 'Blue', value: 'rgba(100, 100, 255, 0.5)' },
  { name: 'Purple', value: 'rgba(200, 100, 255, 0.5)' },
];

const NavigationControls = ({
  currentPage,
  totalPages,
  scale,
  onPageChange,
  onNext,
  onPrev,
  onZoomIn,
  onZoomOut,
  onFitToWidth,
  onDownloadOriginal,
  onExportAnnotated,
  onToggleDrawing,
  onSetHighlighterColor,
  onSetHighlighterSize,
  onAddImage,
  isDrawing,
  highlighterColor,
  highlighterSize
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const [customColor, setCustomColor] = useState('#ffff00');
  const fileInputRef = useRef(null);

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handleColorSelect = (color) => {
    onSetHighlighterColor(color);
    if (isDrawing && highlighterColor === 'eraser') {
      onToggleDrawing();
    }
  };

  const handleCustomColorChange = (e) => {
    const hex = e.target.value;
    setCustomColor(hex);
    if (!hex || hex.length !== 7 || !hex.startsWith('#')) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, 0.5)`;
    handleColorSelect(rgba);
  };

  const handleEraserClick = () => {
    if (highlighterColor !== 'eraser') {
      onSetHighlighterColor('eraser');
      if (!isDrawing) {
        onToggleDrawing();
      }
    }
  };

  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) {
      onAddImage(file);
    }
    // Reset the input to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <div className="navigation-controls">
      <div className="tool-group">
        <div className="highlighter-controls">
          <button
            onClick={onToggleDrawing}
            className={`tool-btn ${isDrawing && highlighterColor !== 'eraser' ? 'active' : ''}`}
            aria-label={isDrawing && highlighterColor !== 'eraser' ? 'Disable highlighter' : 'Enable highlighter'}
            title={isDrawing && highlighterColor !== 'eraser' ? 'Disable highlighter' : 'Enable highlighter'}
          >
            ✏️
          </button>
          
          <div className="color-picker">
            {HIGHLIGHTER_COLORS.map(color => (
              <button
                key={color.value}
                className={`color-btn ${highlighterColor === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorSelect(color.value)}
                title={`${color.name} highlighter`}
                aria-label={`${color.name} highlighter`}
              />
            ))}
            <div className="custom-color-picker">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                title="Custom highlighter color"
                aria-label="Custom highlighter color"
              />
            </div>
          </div>
          
          <div className="size-control">
            <input
              type="range"
              min="1"
              max="20"
              value={highlighterSize}
              onChange={(e) => onSetHighlighterSize(parseInt(e.target.value))}
              className="size-slider"
              title="Highlighter size"
            />
            <span className="size-value">{highlighterSize}px</span>
          </div>
          
          <button
            onClick={handleEraserClick}
            className={`tool-btn ${highlighterColor === 'eraser' ? 'active' : ''}`}
            title="Eraser"
            aria-label="Eraser"
          >
            🗑️
          </button>

          <button
            onClick={handleAddImageClick}
            className="tool-btn"
            title="Add Image"
            aria-label="Add Image"
          >
            <FaImage />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="nav-group">
        <button
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="nav-btn"
          aria-label="Previous page"
        >
          ← Previous
        </button>
        
        <form onSubmit={handlePageInputSubmit} className="page-form">
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            className="page-input"
            aria-label="Page number"
          />
          <span className="page-total">of {totalPages}</span>
        </form>
        
        <button
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="nav-btn"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      <div className="zoom-group">
        <button
          onClick={onZoomOut}
          className="zoom-btn"
          aria-label="Zoom out"
        >
          🔍−
        </button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button
          onClick={onZoomIn}
          className="zoom-btn"
          aria-label="Zoom in"
        >
          🔍+
        </button>
        <button
          onClick={onFitToWidth}
          className="zoom-btn"
          aria-label="Fit to width"
        >
          ↔️ Fit Width
        </button>
      </div>

      <div className="export-group">
        <button
          onClick={onDownloadOriginal}
          className="export-btn"
          aria-label="Download original PDF"
        >
          📥 Original
        </button>
        <button
          onClick={onExportAnnotated}
          className="export-btn"
          aria-label="Export annotated PDF"
        >
          📤 Update PDF
        </button>
      </div>
    </div>
  );
};

export default NavigationControls;
