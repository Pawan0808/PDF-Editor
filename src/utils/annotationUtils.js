export const generatePdfFingerprint = async (arrayBuffer) => {
  // Use browser's built-in crypto API for SHA-256 hashing
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export const saveAnnotations = (pdfFingerprint, annotations, comments) => {
  const data = {
    annotations,
    comments,
    lastUpdated: new Date().toISOString()
  }
  
  const key = `pdf_annotations_${pdfFingerprint}`
  localStorage.setItem(key, JSON.stringify(data))
}

export const loadAnnotations = (pdfFingerprint) => {
  const key = `pdf_annotations_${pdfFingerprint}`
  const stored = localStorage.getItem(key)
  
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (error) {
      console.error('Error parsing stored annotations:', error)
      return { annotations: {}, comments: [] }
    }
  }
  
  return { annotations: {}, comments: [] }
}

export const clearAnnotations = (pdfFingerprint) => {
  const key = `pdf_annotations_${pdfFingerprint}`
  localStorage.removeItem(key)
}

export const getAllAnnotationKeys = () => {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('pdf_annotations_')) {
      keys.push(key)
    }
  }
  return keys
}
