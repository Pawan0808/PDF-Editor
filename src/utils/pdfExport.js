import { PDFDocument, rgb, PDFName } from 'pdf-lib';

export const exportAnnotatedPdf = async (pdfData, annotations, comments, images, pdfDocument) => {
  try {
    // Load the existing PDF
    const existingPdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Process each page
    const pageCount = pdfDoc.getPageCount();
    
    for (let pageNum = 0; pageNum < pageCount; pageNum++) {
      const page = pdfDoc.getPage(pageNum);
      const { width, height } = page.getSize();
      
      // Draw annotations
      const pageAnnotations = annotations[pageNum + 1] || [];
      for (const annotation of pageAnnotations) {
        if (annotation.type === 'highlight' && annotation.points && annotation.points.length > 1) {
          const [firstPoint, ...otherPoints] = annotation.points;
          
          // Draw the highlight
          page.drawLine({
            start: { x: firstPoint.x, y: height - firstPoint.y },
            end: { x: otherPoints[0].x, y: height - otherPoints[0].y },
            thickness: annotation.size || 3,
            color: parseRgba(annotation.color || 'rgba(255, 255, 0, 0.5)'),
            opacity: 0.5,
          });
          
          // Draw connecting lines
          for (let i = 1; i < otherPoints.length; i++) {
            page.drawLine({
              start: { x: otherPoints[i-1].x, y: height - otherPoints[i-1].y },
              end: { x: otherPoints[i].x, y: height - otherPoints[i].y },
              thickness: annotation.size || 3,
              color: parseRgba(annotation.color || 'rgba(255, 255, 0, 0.5)'),
              opacity: 0.5,
            });
          }
        }
      }
      
      // Draw images for this page
      const pageImages = images[pageNum + 1] || [];
      for (const img of pageImages) {
        try {
          // Convert data URL to Uint8Array
          const base64Data = img.src.split('base64,')[1];
          if (!base64Data) {
            console.warn('Invalid image data URL format');
            continue;
          }

          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Determine image type
          let image;
          if (img.src.startsWith('data:image/png')) {
            image = await pdfDoc.embedPng(bytes);
          } else if (img.src.startsWith('data:image/jpeg') || img.src.startsWith('data:image/jpg')) {
            image = await pdfDoc.embedJpg(bytes);
          } else {
            console.warn('Unsupported image format:', img.src.split(';')[0]);
            continue;
          }

          // Ensure all values are valid numbers
          const x = Number(img.x) || 0;
          const y = Number(img.y) || 0;
          const imgWidth = Number(img.width) || 100; // Default width if not specified
          const imgHeight = Number(img.height) || (imgWidth * (image.height / image.width)); // Maintain aspect ratio if height not specified
          
          // Calculate y position (PDF uses bottom-left as origin, web uses top-left)
          const yPos = height - y - imgHeight;
          
          // Draw the image on the page
          page.drawImage(image, {
            x: x,
            y: yPos,
            width: imgWidth,
            height: imgHeight,
          });
        } catch (error) {
          console.error('Error embedding image:', error);
        }
      }

      // Add comments as real PDF Text annotations (sticky notes)
      const pageComments = (comments || []).filter(
        (comment) => comment.pageNumber === pageNum + 1
      );

      if (pageComments.length > 0) {
        // Ensure the page has an Annots array
        let annots = page.node.Annots();
        if (!annots) {
          annots = pdfDoc.context.obj([]);
          page.node.set(PDFName.of('Annots'), annots);
        }

        for (const comment of pageComments) {
          try {
            const x = Number(comment.x) || 0;
            const y = Number(comment.y) || 0;
            const text = comment.text || '';

            if (!text) continue;

            const iconSize = 20;

            // Convert from canvas top-left coordinates to PDF bottom-left
            const left = x;
            const bottom = height - y - iconSize;
            const right = left + iconSize;
            const top = bottom + iconSize;

            const rect = [left, bottom, right, top];

            const annotationDict = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Text',
              Rect: rect,
              Contents: text,
              Name: 'Comment', // icon type (e.g., Comment, Note, Help, etc.)
              C: [1, 0.8, 0],  // yellow note color
              Open: false,
            });

            annots.push(annotationDict);
          } catch (error) {
            console.error('Error adding comment annotation to PDF:', error);
          }
        }
      }
    }
    
    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};

// Helper function to convert CSS rgba() to PDF-lib color
function parseRgba(rgba) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return rgb(0, 0, 0);
  
  return rgb(
    parseInt(match[1]) / 255,
    parseInt(match[2]) / 255,
    parseInt(match[3]) / 255
  );
}