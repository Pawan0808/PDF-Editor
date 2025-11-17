import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './CommentsPanel.css'

const CommentsPanel = ({ comments, onPageComments, currentPage, allComments }) => {
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [pendingPlacementComment, setPendingPlacementComment] = useState(null)

  const saveComment = () => {
    if (!newComment.trim()) return

    // Save the text first; placement will be chosen with the next click on the PDF
    const baseComment = {
      id: uuidv4(),
      pageNumber: currentPage,
      text: newComment.trim(),
      resolved: false,
      timestamp: new Date().toISOString()
    }

    setPendingPlacementComment(baseComment)
    setNewComment('')
    setIsAddingComment(false)
  }

  const toggleResolved = (commentId) => {
    const updatedComments = allComments.map(comment =>
      comment.id === commentId
        ? { ...comment, resolved: !comment.resolved }
        : comment
    )
    onPageComments(updatedComments)
  }

  const deleteComment = (commentId) => {
    const updatedComments = allComments.filter(comment => comment.id !== commentId)
    onPageComments(updatedComments)
  }

  // After the user has typed and saved a comment, let them choose
  // where to place the icon on the PDF with the next click
  React.useEffect(() => {
    const handleCanvasClick = (e) => {
      if (!pendingPlacementComment) return

      const canvas = document.querySelector('.pdf-canvas')
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (canvas.height / rect.height)

      const comment = {
        ...pendingPlacementComment,
        x,
        y,
      }

      onPageComments([...allComments, comment])
      setPendingPlacementComment(null)
    }

    if (pendingPlacementComment) {
      document.addEventListener('click', handleCanvasClick)
      return () => document.removeEventListener('click', handleCanvasClick)
    }
  }, [pendingPlacementComment, allComments, onPageComments])

  return (
    <div className="comments-panel">
      <div className="comments-header">
        <h3>Comments (Page {currentPage})</h3>
        <button
          className="add-comment-btn"
          onClick={() => {
            // Toggle writing mode; if a placement is pending, cancel it
            setIsAddingComment(prev => !prev)
            if (pendingPlacementComment) {
              setPendingPlacementComment(null)
            }
            setNewComment('')
          }}
          aria-label="Add comment"
        >
          {pendingPlacementComment
            ? 'Click on PDF to place comment'
            : isAddingComment
              ? 'Type your comment'
              : '+ Add Comment'}
        </button>
      </div>

      {isAddingComment && (
        <div className="comment-input-modal">
          <div className="comment-input-content">

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Enter your comment..."
              className="comment-textarea"
              autoFocus
            />
            <div className="comment-input-actions">
              <button onClick={saveComment} disabled={!newComment.trim()}>
                Save
              </button>
              <button onClick={() => {
                setNewComment('')
                setIsAddingComment(false)
              }}>
                Cancel
              </button>

            </div>
          </div>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">No comments on this page</p>
        ) : (
          comments.map(comment => (
            <div
              key={comment.id}
              className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
            >
              <div className="comment-header">
                <span className="comment-id">#{comment.id}</span>
                <div className="comment-actions">
                  <button
                    onClick={() => toggleResolved(comment.id)}
                    className={`resolve-btn ${comment.resolved ? 'resolved' : ''}`}
                    aria-label={comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    {comment.resolved ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="delete-btn"
                    aria-label="Delete comment"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="comment-text">{comment.text}</div>
              <div className="comment-meta">
                Position: ({Math.round(comment.x)}, {Math.round(comment.y)})
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommentsPanel