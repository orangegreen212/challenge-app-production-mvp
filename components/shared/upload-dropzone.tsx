'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface UploadDropzoneProps {
  onFileSelect?: (file: File) => void;
  className?: string;
}

export function UploadDropzone({ onFileSelect, className }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (selectedFile: File) => {
      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });
      onFileSelect?.(selectedFile);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (file) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10">
            <FileCheck2 className="h-6 w-6 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFile(selected);
          }}
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Upload className="h-8 w-8 text-primary" strokeWidth={2} />
        </div>
        <p className="font-semibold text-foreground text-lg">Drop your file here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>Supported: PDF · DOCX · TXT</span>
        </div>
      </div>
    </div>
  );
}
