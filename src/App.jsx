import React, { useState } from 'react'
import PdfViewer from './components/PdfViewer'
import './App.css'

function App() {
  const [driveUrl, setDriveUrl] = useState('')
  const [pdfData, setPdfData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFetchPdf = async () => {
    if (!driveUrl.trim()) {
      setError('Please enter a Google Drive URL')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check if it's a direct PDF URL for testing
      if (driveUrl.includes('.pdf') || driveUrl.includes('test-pdf')) {
        // Use a CORS-enabled test PDF
        const testUrl = driveUrl.includes('test-pdf') 
          ? 'https://cors-anywhere.herokuapp.com/https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
          : driveUrl
        const response = await fetch(testUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
        setPdfData(blob)
        return
      }

      // Try webhook with the exact path
      const n8nWebhookUrl = '/webhook/9eb886e1-835a-431d-8436-037131378e6b'
      let response
      
      // Try /webhook-test first
      try {
        response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: driveUrl.trim() })
        })
        
        if (response.ok) {
          console.log('Webhook-test path worked')
        }
      } catch (err) {
        console.log('Webhook-test failed, trying /webhook')
      }
      
      // If first attempt failed, try /webhook
      if (!response || !response.ok) {
        try {
          response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: driveUrl.trim() })
          })
          console.log('Trying /webhook path')
        } catch (err) {
          console.log('Both webhook paths failed')
        }
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errText ? ` - ${errText.slice(0,200)}` : ''}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        // Handle async workflow - poll for completion
        const data = await response.json()
        console.log('Initial JSON response:', data)
        if (data.message === 'Workflow was started') {
          setError('Workflow started. Fetching PDF...')
          
          // Poll for the PDF result
          const pollForPdf = async (retries = 5) => {
            for (let i = 0; i < retries; i++) {
              await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
              
              try {
                const pollResponse = await fetch(n8nWebhookUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ url: driveUrl.trim() })
                })
                
                if (pollResponse.ok) {
                  const pollContentType = pollResponse.headers.get('content-type')
                  
                  if (!pollContentType || !pollContentType.includes('application/json')) {
                    // Got the PDF!
                    const arrayBuffer = await pollResponse.arrayBuffer()
                    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
                    setPdfData(blob)
                    setError('')
                    setLoading(false)
                    return
                  }
                }
              } catch (err) {
                console.log(`Poll attempt ${i + 1} failed:`)
              }
              
              setError(`Workflow in progress... (${i + 1}/${retries})`)
            }
            
            setError('Workflow timed out. Please try again.')
            setLoading(false)
          }
          
          pollForPdf()
          return
        }
      }

      // If we get here, assume it's a PDF
      const arrayBuffer = await response.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
      setPdfData(blob)
    } catch (err) {
      setError(err.message)
      setPdfData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleFetchPdf()
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Editor</h1>
        <p>Enter a Google Drive direct download URL to view and annotate PDFs</p>
      </header>

      <div className="url-input-section">
        <div className="input-group">
          <input
            type="text"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://drive.google.com/uc?export=download&id=FILE_ID"
            className="url-input"
            aria-label="Google Drive URL"
          />
          <button
            onClick={handleFetchPdf}
            disabled={loading}
            className="fetch-button"
            aria-label="Fetch PDF"
          >
            {loading ? <span className="loading-spinner"></span> : 'Load PDF'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      {pdfData && (
        <div className="pdf-viewer-container">
          <PdfViewer pdfData={pdfData} />
        </div>
      )}
    </div>
  )
}

export default App