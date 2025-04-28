'use client';

import React, { useState, useEffect } from 'react';
import { ServerOCRProcessor } from './ServerOCRProcessor';
import { ClientOCRProcessor } from './ClientOCRProcessor';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Trash, FileText, FileImage, FileSpreadsheet, Type, Eye } from "lucide-react";

import { OCRResults } from '@/components/ocr/OCRResults';

interface HybridOCRProcessorProps {
  fileId: string;
  bucketFileId: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  language?: string;
  advancedMode?: boolean;
  onComplete: (result: {
    text: string;
    confidence: number;
    pageCount: number;
    processingTime: number;
  }) => void;
}

export function HybridOCRProcessor({
  fileId,
  bucketFileId,
  fileUrl,
  fileType,
  fileName,
  language = 'eng',
  advancedMode = false,
  onComplete
}: HybridOCRProcessorProps) {
  const [processingMode, setProcessingMode] = useState<'server' | 'client' | 'manual'>('server');
  const [error, setError] = useState<Error | null>(null);
  
  // Handle server OCR completion
  const handleServerComplete = (result: any) => {
    console.log('Server OCR completed successfully');
    onComplete(result);
  };
  
  // Handle server OCR error - switch to client-side processing
  const handleServerError = (error: Error) => {
    console.error('Server OCR failed, switching to client-side processing:', error);
    setError(error);
    
    // Only auto-switch to client for image files (client-side OCR doesn't handle PDFs)
    if (fileType === 'image') {
      setProcessingMode('client');
    } else {
      // For non-image files, let the user decide
      setProcessingMode('manual');
    }
  };
  
  // Handle client OCR completion
  const handleClientComplete = (result: any) => {
    console.log('Client OCR completed successfully');
    onComplete(result);
  };
  
  // Handle client OCR error
  const handleClientError = (error: Error) => {
    console.error('Client OCR failed:', error);
    setError(error);
    // Stay in client mode - user can retry
  };
  
  // Manual switch to client mode
  const switchToClientMode = () => {
    setProcessingMode('client');
  };
  
  // Determine if we can use client-side processing
  const canUseClientOCR = fileType === 'image';
  
  // Render based on current processing mode
  if (processingMode === 'server') {
    return (
      <ServerOCRProcessor
        fileId={fileId}
        bucketFileId={bucketFileId}
        fileUrl={fileUrl}
        fileType={fileType}
        fileName={fileName}
        language={language}
        advancedMode={advancedMode}
        onComplete={handleServerComplete}
        onError={handleServerError}
      />
    );
  }
  
  if (processingMode === 'client') {
    if (!canUseClientOCR) {
      return (
        <div className="p-4 border rounded-lg bg-amber-50 text-amber-900">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-medium">Document Type Not Supported</h3>
          </div>
          <p className="text-sm mb-4">
            Client-side OCR only works with image files. Your file ({fileName}) appears to be a {fileType}.
            Please try a different file or contact support.
          </p>
        </div>
      );
    }
    
    return (
      <ClientOCRProcessor
        imageUrl={fileUrl}
        language={language}
        onComplete={handleClientComplete}
        onError={handleClientError}
      />
    );
  }
  
  // Manual fallback selection
  return (
    <div className="p-4 border rounded-lg bg-amber-50 text-amber-900">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-medium">Server OCR Failed</h3>
      </div>
      <p className="text-sm mb-4">
        Server-side OCR processing encountered an error: {error?.message || 'Unknown error'}
      </p>
      
      {canUseClientOCR ? (
        <div>
          <p className="text-sm mb-2">
            Would you like to try processing in your browser instead? This may take longer
            but can work when server processing is unavailable.
          </p>
          <Button onClick={switchToClientMode} variant="default" className="w-full mt-2">
            Try Browser Processing <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="text-sm">
          Unfortunately, client-side OCR is only available for image files.
          Please try again later when the server is available.
        </p>
      )}
    </div>
  );
} 