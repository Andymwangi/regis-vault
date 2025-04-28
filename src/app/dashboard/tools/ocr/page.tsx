'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Upload, Settings, InfoIcon, RefreshCw } from 'lucide-react';
import { ocrConfig } from '@/lib/config/ocr';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/appwrite/client-file-operations';
import { OCRResults, OCRResultData } from '@/components/ocr/OCRResults';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ServerOCRProcessor } from '@/components/ocr/ServerOCRProcessor';
import { Progress } from '@/components/ui/progress';
import { v4 as uuidv4 } from 'uuid';

// Add missing type for processing status
type ProcessingStatus = 'preparing' | 'processing' | 'completed' | 'failed';

export default function OCRPage() {
  // Define the maximum file size
  const maxFileSizeMB = 50; // 50MB max file size

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [language, setLanguage] = useState('eng');
  const [documentType, setDocumentType] = useState('general');
  const [quality, setQuality] = useState(75);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResultData | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [checkStatusInterval, setCheckStatusInterval] = useState<NodeJS.Timeout | null>(null);
  const [serverProcessing, setServerProcessing] = useState(false);
  const [fileData, setFileData] = useState<any>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [serverOCRFile, setServerOCRFile] = useState<{
    fileId: string;
    bucketFileId: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
  } | null>(null);
  const [serverOCRTimeout, setServerOCRTimeout] = useState(false);
  const [statusCheckAttempts, setStatusCheckAttempts] = useState(0);
  const MAX_STATUS_CHECK_ATTEMPTS = 10; // About 30 seconds total
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error('Please select a valid file type (PNG, JPG, PDF)');
      return;
    }

    const file = acceptedFiles[0];
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(`File size exceeds the ${maxFileSizeMB}MB limit`);
      return;
    }

    // Reset all state variables
    setFile(file);
    setError(null);
    setProcessingStatus('preparing');
    setOcrResult(null);
    setProcessing(false);
    setServerProcessing(false);
    setFileData(null);
    setServerOCRFile(null);
    
    // Clear any existing interval
    if (checkStatusInterval) {
      clearInterval(checkStatusInterval);
      setCheckStatusInterval(null);
    }
    
    // Generate a file ID immediately on file upload
    const generatedFileId = uuidv4();
    setFileId(generatedFileId);
    
    // Create a preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreview('/placeholder-pdf.png');
    } else {
      setPreview('/placeholder-document.png');
    }
  }, [checkStatusInterval, maxFileSizeMB]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const processOCR = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      toast.info('Uploading document for OCR processing...');
      
      // Upload the file to Appwrite
      console.log(`Starting upload of ${file.name}`);
      const uploadResult = await uploadFile(file, '/dashboard/tools/ocr');
      console.log('Upload result:', uploadResult);
      
      // Extract file ID from upload result (support both formats)
      const fileId = uploadResult?.id || uploadResult?.$id;
      
      if (!fileId) {
        console.error('Upload response format error:', uploadResult);
        throw new Error('Upload failed - no file ID returned in response');
      }
      
      console.log(`File uploaded successfully with ID: ${fileId}`);
      setFileId(fileId);
      
      toast.success('Document uploaded successfully');
      
      // Start OCR processing
      console.log(`Starting OCR processing for file: ${fileId}`);
      try {
        const processResponse = await fetch('/api/ocr/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            fileId,
            language,
            quality,
            documentType,
            advancedMode
          }),
        });
        
        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          console.error('OCR process error:', errorData);
          throw new Error(`Failed to start OCR process: ${errorData.message || errorData.error || processResponse.statusText}`);
        }
        
        const processResult = await processResponse.json();
        console.log('OCR processing started:', processResult);
        toast.info('OCR processing started');
      } catch (ocrError) {
        console.error('Error starting OCR process:', ocrError);
        toast.error(`OCR process start failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
        // Continue to check status anyway
      }
      
      // Set up interval to check OCR status every 3 seconds
      const interval = setInterval(async () => {
        try {
          console.log('Checking OCR status for file:', fileId);
          const response = await fetch(`/api/ocr/status?fileId=${fileId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('OCR status error:', errorData);
            throw new Error(`OCR status check failed: ${errorData.message || errorData.error || response.statusText}`);
          }
          
          const statusData = await response.json();
          console.log('OCR status:', statusData);
          
          // Update progress bar and message
          if (statusData.progress) {
            setProcessingProgress(statusData.progress);
          }
          if (statusData.message) {
            setProcessingMessage(statusData.message);
          }
          
          // Track attempts to detect timeouts
          setStatusCheckAttempts(prev => {
            const newCount = prev + 1;
            // If we've been checking for too long, suggest browser OCR
            if (newCount >= MAX_STATUS_CHECK_ATTEMPTS && statusData.status === 'processing') {
              setServerOCRTimeout(true);
              toast.warning('OCR processing is taking longer than expected. Consider trying browser-based OCR for faster results.');
            }
            return newCount;
          });
          
          if (statusData.status === 'completed') {
            // OCR completed, get the results
            clearInterval(interval);
            setCheckStatusInterval(null);
            
            const resultResponse = await fetch(`/api/ocr/result?fileId=${fileId}`);
            if (!resultResponse.ok) {
              const errorData = await resultResponse.json();
              throw new Error(`Failed to get OCR results: ${errorData.message || errorData.error || 'Server error'}`);
            }
            
            const resultData = await resultResponse.json();
            console.log('OCR result:', resultData);
            
            setOcrResult({
              text: resultData.text || 'No text was extracted',
              confidence: resultData.confidence || 0,
              documentName: resultData.fileName || file.name,
              pageCount: resultData.pageCount || 1,
              processingTime: resultData.processingTime || 0,
              fileId
            });
            
            setProcessing(false);
            toast.success('OCR processing completed');
          } else if (statusData.status === 'failed') {
            // OCR failed
            clearInterval(interval);
            setCheckStatusInterval(null);
            const errorMessage = statusData.error || 'Unknown error occurred during OCR processing';
            toast.error(`OCR processing failed: ${errorMessage}`, {
              duration: 8000,
              action: {
                label: 'Retry',
                onClick: () => prepareServerOCR()
              }
            });
            console.error(`OCR processing failed: ${errorMessage}`);
            setProcessing(false);
            setError(errorMessage);
          } else if (statusData.status === 'error') {
            clearInterval(interval);
            setCheckStatusInterval(null);
            setProcessing(false);
            
            // More detailed error message
            const errorMessage = statusData.error || 'An unexpected error occurred';
            console.error(`OCR processing error: ${errorMessage}`);
            
            toast.error(`OCR processing error: ${errorMessage}`, {
              duration: 8000,
              action: {
                label: 'Retry',
                onClick: () => prepareServerOCR()
              }
            });
            setError(errorMessage);
          } else if (statusData.status === 'pending') {
            // Initial status, start OCR processing again
            console.log('OCR is pending, starting processing...');
            fetch('/api/ocr/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fileId }),
            }).catch(err => console.error('Error starting OCR process:', err));
          }
          // If status is 'processing', continue waiting
          
        } catch (error) {
          console.error('Error checking OCR status:', error);
          // Don't clear interval on check errors, try again
        }
      }, 3000);
      
      setCheckStatusInterval(interval);
      
    } catch (error) {
      console.error('Error processing OCR:', error);
      setProcessing(false);
      toast.error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveDocument = async () => {
    if (!ocrResult || !fileId) return;

    try {
      toast.info('Saving document...');
      console.log('Saving OCR result as document:', { fileName: ocrResult.documentName, fileId });
      
      const response = await fetch('/api/tools/ocr/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ocrResult.text,
          fileName: ocrResult.documentName,
          confidence: ocrResult.confidence,
          fileId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save document');
      }

      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(`Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportDocument = async (format = 'txt') => {
    if (!ocrResult || !ocrResult.text) return;
    
    try {
      if (format === 'txt') {
        // Export as text (existing functionality)
        const blob = new Blob([ocrResult.text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const fileName = ocrResult.documentName.replace(/\.[^/.]+$/, '') + '.txt';
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Text document exported successfully');
      } else if (format === 'pdf' || format === 'docx') {
        // Export as PDF or DOCX via API
        const fileName = ocrResult.documentName.replace(/\.[^/.]+$/, '');
        
        const response = await fetch('/api/ocr/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: ocrResult.fileId,
            fileName: fileName,
            format: format
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Failed to export document as ${format.toUpperCase()}`);
        }
        
        const result = await response.json();
        
        // Redirect to the file URL for download
        window.open(result.url, '_blank');
        
        toast.success(`Document exported as ${format.toUpperCase()} successfully`);
      }
    } catch (error) {
      console.error(`Error exporting document as ${format}:`, error);
      toast.error(`Failed to export document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add a check for server OCR failure
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // Try for about 30 seconds

    const checkFailedOCR = async () => {
      if (!fileId || ocrResult || !checkStatusInterval) return;
      
      try {
        const response = await fetch(`/api/ocr/status?fileId=${fileId}`);
        if (!response.ok) return;
        
        const statusData = await response.json();
        console.log('Checking for OCR failures:', statusData);
        
        // If the OCR fails on the server, retry with alternative method
        if (statusData.status === 'failed') {
          console.log('Server OCR failed, attempting retry');
          clearInterval(checkStatusInterval);
          setCheckStatusInterval(null);
          prepareServerOCR();
        }
        
        // Only check a limited number of times
        attempts++;
        if (attempts >= maxAttempts) {
          console.log('Exceeded maximum OCR status check attempts');
          clearInterval(checkStatusInterval);
          setCheckStatusInterval(null);
        }
      } catch (error) {
        console.error('Error checking OCR status for failures:', error);
      }
    };

    // Check every 3 seconds
    const intervalId = setInterval(checkFailedOCR, 3000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fileId, ocrResult, checkStatusInterval]);

  const prepareServerOCR = async () => {
    if (!file || !fileId) {
      toast.error('Please upload a file first');
      return;
    }

    try {
      setServerProcessing(true);
      setProcessingStatus('preparing');
      setError(null);
      
      console.log(`Preparing server OCR processing for file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      toast.info(`Preparing OCR processing for ${file.name}...`);

      // Upload file for server OCR processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', '/dashboard/tools/ocr');

      console.log('Uploading file for server OCR processing...');
      toast.loading('Uploading document...');
      
      // Upload the file to storage
      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('File upload failed:', errorData);
        throw new Error(`Failed to upload file: ${errorData.message || uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('File uploaded successfully:', {
        id: uploadData.id || uploadData.$id,
        name: uploadData.name || file.name,
        size: uploadData.size || file.size,
        bucketFileId: uploadData.bucketFileId
      });
      
      toast.success('Document uploaded, starting OCR processing...');
      
      // Now prepare the file for server OCR
      console.log('Initializing OCR processing with settings:', {
        language,
        advancedMode
      });
      
      const prepareResponse = await fetch(`/api/ocr/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadData.id || uploadData.$id,
          language,
          advancedMode
        }),
      });
      
      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        console.error('Failed to prepare server OCR:', errorData);
        throw new Error(`Failed to prepare OCR: ${errorData.message || prepareResponse.statusText}`);
      }
      
      const serverOCRData = await prepareResponse.json();
      console.log('Server OCR initialization successful:', serverOCRData);
      
      // Set server OCR data
      const serverData = {
        fileId: serverOCRData.fileId || uploadData.id || uploadData.$id,
        bucketFileId: serverOCRData.bucketFileId || uploadData.bucketFileId,
        fileUrl: serverOCRData.fileUrl || '',
        fileType: file.type,
        fileName: file.name,
      };
      
      setServerOCRFile(serverData);
      setFileData(serverData); // Also set this for backward compatibility
      
      setProcessingStatus('processing');
      setProcessing(false);
      toast.info(`OCR processing started for ${file.name}`);
      console.log('OCR processing initiated, monitoring progress...');
    } catch (error) {
      console.error('Error preparing server OCR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to prepare server OCR: ${errorMessage}`);
      setProcessingStatus('failed');
      setServerProcessing(false);
      toast.error(`OCR preparation failed: ${errorMessage}`, {
        duration: 8000,
        action: {
          label: 'Try Again',
          onClick: () => prepareServerOCR()
        }
      });
    }
  };

  const handleServerOCRComplete = async (result: {
    text: string;
    confidence: number;
    pageCount: number;
    processingTime: number;
  }) => {
    try {
      const textLength = result.text.length;
      const processingTimeSeconds = (result.processingTime / 1000).toFixed(1);
      
      console.log('Server OCR completed successfully:', {
        textLength,
        confidence: result.confidence,
        pageCount: result.pageCount,
        processingTime: `${processingTimeSeconds}s`
      });
      
      // Get the filename from either source
      const fileName = serverOCRFile?.fileName || fileData?.fileName || file?.name || 'Document';
      
      // Result is already saved on the server, no need to submit it again
      console.log('OCR results already saved on server');
      
      // Set OCR result
      setOcrResult({
        text: result.text,
        confidence: result.confidence,
        documentName: fileName,
        pageCount: result.pageCount,
        processingTime: result.processingTime,
        fileId: fileId || ''
      });
      
      // Reset states
      setServerProcessing(false);
      setProcessingStatus('completed');
      setFileData(null);
      setServerOCRFile(null);
      
      // Show a more detailed success message
      const successMessage = textLength > 0 
        ? `OCR completed! Extracted ${textLength.toLocaleString()} characters with ${result.confidence}% confidence in ${processingTimeSeconds} seconds`
        : 'OCR completed, but no text was extracted. The document may be an image without text or in an unsupported format.';
      
      toast.success(successMessage, {
        duration: 5000
      });
      
    } catch (error) {
      console.error('Error processing server OCR results:', error);
      setServerProcessing(false);
      setProcessingStatus('failed');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Error details: ${errorMessage}`);
      
      toast.error(`OCR processing failed: ${errorMessage}`, {
        duration: 5000,
        action: {
          label: 'Try Again',
          onClick: () => prepareServerOCR()
        }
      });
    }
  };

  const handleServerOCRError = (error: Error) => {
    console.error('Server OCR processing error:', error);
    
    // Create a more user-friendly error message
    let errorMessage = error.message;
    let recommendation = '';
    
    // Check for common error patterns and provide helpful suggestions
    if (errorMessage.includes('timeout')) {
      recommendation = 'Try processing a smaller document or using standard quality settings.';
    } else if (errorMessage.includes('unsupported file type') || errorMessage.includes('format')) {
      recommendation = 'Make sure the document is in a supported format (PDF, PNG, JPG).';
    } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      recommendation = 'There was an issue accessing the document. Try uploading it again.';
    } else if (errorMessage.includes('OCR engine') || errorMessage.includes('extract')) {
      recommendation = 'The OCR engine had trouble processing this document. Try a clearer scan or different document type.';
    }
    
    // Log the detailed error for debugging
    console.log({
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      recommendation
    });
    
    // Reset processing state
    setServerProcessing(false);
    setProcessingStatus('failed');
    
    // Show toast with the error and recommendation
    const toastMessage = recommendation 
      ? `${errorMessage}. ${recommendation}`
      : errorMessage;
      
    toast.error(`OCR processing failed: ${toastMessage}`, {
      duration: 8000,
      action: {
        label: 'Try Again',
        onClick: () => prepareServerOCR()
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">OCR Document Processing</h1>
            <p className="text-muted-foreground">Convert scanned documents to searchable text</p>
          </div>
        </div>

        {!ocrResult ? (
          <>
            {!serverProcessing ? (
              <>
                <Card className="p-6">
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary'}`}
                  >
                    <input {...getInputProps()} />
                    {preview ? (
                      <div className="space-y-4">
                        <img
                          src={preview}
                          alt="Document preview"
                          className="max-h-64 mx-auto"
                        />
                        <p className="text-sm text-muted-foreground">{file?.name}</p>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-4" />
                        <p className="mb-2">Drag and drop files here</p>
                        <p className="text-sm">or</p>
                        <Button variant="secondary" className="mt-2">
                          Browse Files
                        </Button>
                        <p className="text-xs mt-2">
                          Supported formats: PNG, JPG, PDF
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">OCR Settings</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Document Language
                      </label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {ocrConfig.languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Document Type
                      </label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ocrConfig.documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">
                        Processing Quality
                      </label>
                      <Slider
                        value={[quality]}
                        onValueChange={([value]) => setQuality(value)}
                        min={50}
                        max={100}
                        step={5}
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Higher quality may take longer to process
                      </p>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="advanced-mode" className="flex items-center space-x-2">
                          <Switch
                            id="advanced-mode"
                            checked={advancedMode}
                            onCheckedChange={setAdvancedMode}
                          />
                          <span>Advanced OCR Mode</span>
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Advanced mode attempts multiple OCR engines and language models to extract 
                                text from difficult documents like low-quality scans or images with text. 
                                This mode takes longer but may produce better results.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable for better results with poor quality scans. Processing will take longer.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={processOCR}
                      disabled={!file || processing}
                      className="w-full sm:w-auto"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Process Document'
                      )}
                    </Button>
                  </div>
                  
                  {processing && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Processing: {processingProgress}%</span>
                        <span>{processingMessage}</span>
                      </div>
                      <Progress value={processingProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {processingProgress < 25 && "Initializing OCR process..."}
                        {processingProgress >= 25 && processingProgress < 50 && "Analyzing document structure..."}
                        {processingProgress >= 50 && processingProgress < 75 && "Extracting text from document..."}
                        {processingProgress >= 75 && processingProgress < 95 && "Finalizing text extraction..."}
                        {processingProgress >= 95 && "Almost done..."}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                      {serverOCRTimeout ? (
                        <p className="text-amber-500 font-medium">Server processing is taking too long. Try browser processing for faster results.</p>
                      ) : (
                        <p>Having trouble with OCR processing?</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {process.env.NODE_ENV === 'development' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log('Debug state:', {
                              fileId,
                              serverProcessing,
                              fileData,
                              serverOCRFile,
                              processingStatus
                            });
                            toast.info('Check browser console for debug info');
                          }}
                        >
                          Debug
                        </Button>
                      )}
                      {serverOCRTimeout && (
                        <Button
                          variant={serverOCRTimeout ? "default" : "outline"}
                          size="sm"
                          onClick={prepareServerOCR}
                          disabled={!file || processing}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Server Processing
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-6">
                {(serverOCRFile || fileData) && (
                  <ServerOCRProcessor
                    fileId={serverOCRFile?.fileId || fileData?.fileId || fileId || ''}
                    bucketFileId={serverOCRFile?.bucketFileId || fileData?.bucketFileId || ''}
                    fileUrl={serverOCRFile?.fileUrl || fileData?.fileUrl || ''}
                    fileType={serverOCRFile?.fileType || fileData?.fileType || file?.type || ''}
                    fileName={serverOCRFile?.fileName || fileData?.fileName || file?.name || 'Document'}
                    language={language}
                    advancedMode={advancedMode}
                    onComplete={handleServerOCRComplete}
                    onError={handleServerOCRError}
                  />
                )}
                {!serverOCRFile && !fileData && (
                  <div className="text-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">Preparing document for server processing...</p>
                    {error && (
                      <p className="text-destructive mt-2">{error}</p>
                    )}
                  </div>
                )}
              </Card>
            )}
          </>
        ) : (
          <OCRResults 
            result={ocrResult} 
            onSave={saveDocument} 
            onExport={exportDocument}
          />
        )}
      </div>
      {
        // Display error notification if server timeout
        serverOCRTimeout && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">OCR Processing Status</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>The OCR processing is taking longer than expected. This could be due to:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Complex document structure or formatting</li>
                    <li>Large document with many pages</li>
                    <li>Low-quality scan or image resolution</li>
                    <li>High server load at the moment</li>
                  </ul>
                  <p className="mt-2">You can either wait for processing to complete or try one of the options below:</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={prepareServerOCR}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Processing
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fileId && checkStatusInterval) {
                        // Cancel the current OCR job and start fresh
                        clearInterval(checkStatusInterval);
                        setCheckStatusInterval(null);
                        setProcessing(false);
                        setServerOCRTimeout(false);
                        setProcessingProgress(0);
                        setStatusCheckAttempts(0);
                        toast.info("OCR processing cancelled. You can try again with different settings.");
                      }
                    }}
                  >
                    Cancel Processing
                  </Button>
                </div>
                <p className="mt-3 text-xs text-yellow-600">
                  OCR processing is continuing in the background. If it completes, your results will appear automatically.
                </p>
              </div>
            </div>
          </div>
        )
      }
    </DashboardLayout>
  );
} 