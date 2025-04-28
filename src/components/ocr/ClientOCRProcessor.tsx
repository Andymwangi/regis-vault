'use client';

import React, { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ClientOCRProcessorProps {
  imageUrl: string;
  language?: string;
  onComplete: (result: {
    text: string;
    confidence: number;
    pageCount: number;
    processingTime: number;
  }) => void;
  onError: (error: Error) => void;
}

export function ClientOCRProcessor({
  imageUrl,
  language = 'eng',
  onComplete,
  onError
}: ClientOCRProcessorProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('Preparing OCR...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client-side OCR processing with Tesseract.js
  const processImageWithTesseract = async () => {
    try {
      setStatus('processing');
      setProgress(10);
      setStatusText('Loading OCR engine...');
      const startTime = Date.now();

      // Create Tesseract worker with specified language
      const worker = await createWorker(language);
      setProgress(30);
      setStatusText('Engine loaded. Processing image...');

      // Process the image
      const result = await worker.recognize(imageUrl);
      setProgress(90);
      setStatusText('Finalizing results...');

      // Terminate worker to free resources
      await worker.terminate();
      setProgress(100);
      setStatus('completed');
      setStatusText('Processing complete');

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Submit results
      onComplete({
        text: result.data.text,
        confidence: result.data.confidence,
        pageCount: 1, // Images are always one page
        processingTime: processingTime
      });

    } catch (error) {
      console.error('Client-side OCR processing error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      onError(error instanceof Error ? error : new Error('OCR processing failed'));
    }
  };

  // Start processing when component mounts
  useEffect(() => {
    processImageWithTesseract();
  }, [imageUrl, language]);

  // Handle retry action
  const handleRetry = () => {
    setErrorMessage(null);
    setStatus('idle');
    setProgress(0);
    processImageWithTesseract();
  };

  // Render different UI based on status
  if (status === 'error') {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-lg font-medium">OCR Processing Error</h3>
        </div>
        <p className="text-sm mb-4">
          {errorMessage || 'Failed to process your image. Please try again.'}
        </p>
        <Button onClick={handleRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <h3 className="text-lg font-medium">Processing Complete</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Text extraction has been completed successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-card shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-medium">Processing Document</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{statusText}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        Processing images directly in your browser with Tesseract.js.
        This might take a minute depending on your device and image complexity.
      </p>
    </div>
  );
} 