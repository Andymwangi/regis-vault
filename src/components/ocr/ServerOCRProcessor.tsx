'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAssistant } from '@/components/assistant/RegisvaultAssistant';
/**
 * Server OCR Processor Component
 * 
 * This component manages the server-side OCR processing workflow.
 * The OCR processing is done entirely on the server using:
 *  - Tesseract.js for image OCR
 *  - PDF-parse for PDF document text extraction
 * 
 * The component polls the server for status updates and displays progress to the user.
 */

// Interface for Server OCR Processor
interface ServerOCRProcessorProps {
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
  onError: (error: Error) => void;
}

// Error boundary component for OCR processing
const OCRErrorBoundary: React.FC<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}> = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  // Error handler
  const handleError = useCallback((error: Error) => {
    console.error('OCR component error:', error);
    setHasError(true);
  }, []);

  // Reset error state
  const resetError = useCallback(() => {
    setHasError(false);
  }, []);

  // If error occurred, show fallback UI
  if (hasError) {
    return (
      <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">OCR Processing Error</h3>
          </div>
        </div>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We encountered an error while trying to process your document. 
            The OCR service may be temporarily unavailable.
          </p>
          
          <div className="mt-4">
            <Button 
              onClick={resetError}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
          
          {fallback}
        </div>
      </div>
    );
  }

  // Otherwise, render children
  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

// Simple React Error Boundary implementation
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (error: Error) => void;
}> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('OCR error boundary caught error:', error, errorInfo);
    this.props.onError(error);
  }
  
  render() {
    return this.props.children;
  }
}

export function ServerOCRProcessor(props: ServerOCRProcessorProps) {
  // Wrap the internal implementation with an error boundary
  return (
    <OCRErrorBoundary
      fallback={
        <div className="mt-4 text-sm text-muted-foreground">
          <p>If the problem persists, please try:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Refreshing the page</li>
            <li>Using a different file format (PDF, PNG, JPEG)</li>
            <li>Using a clearer image or document</li>
            <li>Contacting support if the issue continues</li>
          </ul>
        </div>
      }
    >
      <ServerOCRProcessorInternal {...props} />
    </OCRErrorBoundary>
  );
}

// Internal implementation with all the OCR logic
function ServerOCRProcessorInternal({
  fileId,
  bucketFileId,
  fileUrl,
  fileType,
  fileName,
  language = 'eng',
  advancedMode = false,
  onComplete,
  onError
}: ServerOCRProcessorProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('Preparing OCR...');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const { showHelp } = useAssistant();
  // Main OCR process - server-only approach
  useEffect(() => {
    const processDocumentOnServer = async () => {
      const startTime = Date.now();
      setStatus('processing');
      console.log(`Starting OCR processing for document: ${fileName} (${fileType})`);
      
      try {
        // Step 1: Start OCR processing on the server with the existing fileId
        setProgress(10);
        setStatusText('Initializing OCR engine...');
        
        console.log('Starting server OCR processing for:', { 
          fileId, 
          bucketFileId, 
          fileName, 
          language, 
          advancedMode 
        });
        
        // Add delay between status updates to avoid overwhelming logs
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Submit to the server for processing
        try {
          const processResponse = await fetch('/api/ocr/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: fileId,
              language: language,
              useAdvanced: advancedMode
            }),
          });
          
          if (!processResponse.ok) {
            const errorData = await processResponse.json();
            console.error('OCR process error:', errorData);
            throw new Error(`Failed to start OCR process: ${errorData.message || processResponse.statusText || processResponse.status}`);
          }
          
          console.log('OCR processing started successfully');
          
        } catch (processError) {
          console.error('Error initiating OCR process:', processError);
          
          // If we get a fetch error, wait and retry once more
          await wait(1500);
          const retryResponse = await fetch('/api/ocr/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: fileId,
              language: language,
              useAdvanced: advancedMode
            }),
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Failed to start OCR process after retry: ${retryResponse.status}`);
          }
          
          console.log('OCR processing started after retry');
        }
        
        // Step 2: Poll for OCR results
        setProgress(20);
        setStatusText(`Processing document: ${fileName} (${language})`);
        
        let statusCheckCount = 0;
        const maxStatusChecks = 60; // Try for up to 120 seconds (60 x 2s)
        let ocrComplete = false;
        let lastStatus = '';
        let consecutiveErrors = 0;
        
        while (!ocrComplete && statusCheckCount < maxStatusChecks) {
          statusCheckCount++;
          
          // Update progress based on check count
          const currentProgress = 20 + Math.floor((statusCheckCount / maxStatusChecks) * 70);
          setProgress(currentProgress);
          
          console.log(`Checking OCR status (attempt ${statusCheckCount}/${maxStatusChecks})...`);
          
          // Wait 2 seconds between checks
          await wait(2000);
          
          try {
            // Get current status
            const statusResponse = await fetch(`/api/ocr/status?fileId=${fileId}`);
            if (!statusResponse.ok) {
              console.error('Error checking OCR status:', statusResponse.status);
              setStatusText(`Server status check error (${statusResponse.status}), retrying...`);
              
              consecutiveErrors++;
              
              // If we have too many consecutive errors, try a different approach
              if (consecutiveErrors >= 3) {
                throw new Error(`Too many consecutive errors (${consecutiveErrors}) checking OCR status`);
              }
              
              continue;
            }
            
            // Reset consecutive errors counter on successful response
            consecutiveErrors = 0;
            
            const statusData = await statusResponse.json();
            console.log('OCR status check result:', statusData);
            
            // Only update status text if it changed
            if (statusData.message && statusData.message !== lastStatus) {
              setStatusText(`Processing: ${statusData.message || 'In progress...'} (${currentProgress}%)`);
              lastStatus = statusData.message;
            } else if (!statusData.message) {
              // If no message, at least update the progress percentage
              setStatusText(`Processing document: ${fileName} (${currentProgress}%)`);
            }
            
            if (statusData.status === 'completed') {
              // Success! Fetch the results
              console.log('OCR processing completed, fetching results...');
              setStatusText('OCR processing complete, retrieving text...');
              
              const resultResponse = await fetch(`/api/ocr/result?fileId=${fileId}`);
              if (!resultResponse.ok) {
                throw new Error(`Failed to get OCR results: ${resultResponse.status}`);
              }
              
              const resultData = await resultResponse.json();
              console.log('OCR result fetched successfully', {
                textLength: resultData.text?.length || 0,
                confidence: resultData.confidence || 0,
                pageCount: resultData.pageCount || 1
              });
              
              // Success!
              setProgress(100);
              setStatusText(`OCR complete! Extracted ${resultData.text?.length || 0} characters with ${resultData.confidence || 0}% confidence`);
              setStatus('completed');
              
              // Calculate processing time
              const processingTime = Date.now() - startTime;
              const seconds = (processingTime / 1000).toFixed(1);
              console.log(`OCR processing completed in ${seconds} seconds`);
              
              // Return results
              onComplete({
                text: resultData.text || 'No text extracted',
                confidence: resultData.confidence || 0,
                pageCount: resultData.pageCount || 1,
                processingTime
              });
              
              ocrComplete = true;
              break;
              
            } else if (statusData.status === 'failed' || statusData.status === 'error') {
              // OCR processing failed
              const errorMessage = statusData.error || 'Unknown error';
              console.error(`OCR processing failed: ${errorMessage}`);
              throw new Error(`OCR processing failed: ${errorMessage}`);
            } else if (statusData.status === 'pending' && statusCheckCount > 10) {
              // If still pending after several checks, try to restart the process
              console.log('OCR processing still pending after multiple checks, triggering restart');
              
              // Trigger a restart by calling the process endpoint again
              const restartResponse = await fetch('/api/ocr/process', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fileId: fileId,
                  language: language,
                  useAdvanced: advancedMode
                }),
              });
              
              if (restartResponse.ok) {
                console.log('OCR processing restarted');
                setStatusText('OCR processing restarted...');
              }
            }
            // If status is pending or processing, continue waiting
          } catch (statusError) {
            console.error('Error checking OCR status:', statusError);
            
            // Add more informative error message
            setStatusText(`Status check error: ${statusError instanceof Error ? statusError.message : 'Unknown error'}`);
            
            // Increment consecutive errors counter
            consecutiveErrors++;
            
            // If we have too many consecutive errors, give up
            if (consecutiveErrors >= 5) {
              throw new Error(`Too many consecutive errors (${consecutiveErrors}) checking OCR status`);
            }
          }
        }
        
        if (!ocrComplete) {
          console.error('OCR processing timed out after 120 seconds');
          throw new Error('OCR processing timed out after 120 seconds. Try again or use a different document.');
        }
        
      } catch (error) {
        console.error('Error in OCR processing:', error);
        setStatus('error');
        setStatusText('OCR processing failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown OCR processing error';
        setError(errorMessage);
        console.log(`OCR error details: ${errorMessage}`);
        onError(error instanceof Error ? error : new Error('OCR processing failed'));
      }
    };
    
    // Start processing
    processDocumentOnServer();
  }, [fileId, bucketFileId, fileName, fileType, language, advancedMode, retryCount, onComplete, onError]);
  
  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setStatusText('Preparing OCR...');
    setRetryCount(count => count + 1);
  };
  
  return (
    <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Processing Document</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {status === 'processing' || !status || status === 'idle' ? (
            <div className="flex items-center gap-2">
              
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : status === 'retrying' ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Retrying... ({retryCount}/{maxRetries})</span>
            </div>
          ) : status === 'completed' ? (
            <span>Completed</span>
          ) : (
            <span className="text-destructive">Error</span>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Document</h4>
          <p className="text-sm text-muted-foreground">{fileName}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-1">Status</h4>
          <p className="text-sm">{statusText}</p>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-1">Progress</h4>
          <Progress value={progress} className="h-2" />
        </div>
        
        {status === 'error' && (
          <div className="mt-4">
            <Button 
              onClick={handleRetry}
              className="w-full"
              variant="secondary"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Processing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 