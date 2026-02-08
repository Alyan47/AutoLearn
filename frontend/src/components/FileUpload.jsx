import React, { useState } from 'react';
import './FileUpload.css';

function FileUpload({ onFileUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please drop a PDF file');
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileUploaded(selectedFile);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          id="file-input"
          className="file-input"
        />
        
        <label htmlFor="file-input" className="file-label">
          <div className="upload-icon">📄</div>
          <p className="upload-text">
            {selectedFile ? selectedFile.name : 'Drag & drop a PDF or click to browse'}
          </p>
          <p className="upload-subtext">
            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max size: 10MB'}
          </p>
        </label>
      </div>

      {selectedFile && (
        <button className="upload-button" onClick={handleUpload}>
          Upload & Process
        </button>
      )}
    </div>
  );
}

export default FileUpload;