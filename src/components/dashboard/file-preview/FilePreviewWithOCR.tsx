'use client';

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Trash, FileText, FileImage, FileSpreadsheet, Type, Eye } from "lucide-react";
import { HybridOCRProcessor } from '@/components/ocr/HybridOCRProcessor';
import { OCRResults } from '@/components/ocr/OCRResults';

interface FilePreviewWithOCRProps {
  file: {
    id: string;
    bucketFileId: string;
    name: string;
    type: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    dateModified: Date;
    owner: {
      id: string;
      name: string;
    };
  };
  onDownload?: (fileId: string) => void;
  onShare?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
}

export function FilePreviewWithOCR({ 
  file, 
  onDownload, 
  onShare, 
  onDelete 
}: FilePreviewWithOCRProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [ocrResult, setOcrResult] = useState<{
    text: string;
    confidence: number;
    pageCount: number;
    processingTime: number;
  } | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  
  const getFileIcon = () => {
    if (file.type.includes('image')) return <FileImage className="h-10 w-10 text-blue-500" />;
    if (file.type.includes('pdf')) return <FileText className="h-10 w-10 text-red-500" />;
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
      return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
    }
    return <FileText className="h-10 w-10 text-gray-500" />;
  };
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const handleOCRComplete = (result: any) => {
    setOcrResult(result);
    setIsProcessingOCR(false);
  };
  
  const startOCRProcessing = () => {
    setIsProcessingOCR(true);
    setActiveTab('ocr');
  };
  
  const isOCRSupported = file.type.includes('image') || file.type.includes('pdf');
  
  const renderPreview = () => {
    if (file.type.includes('image')) {
      return (
        <div className="flex justify-center p-4">
          <img 
            src={file.url} 
            alt={file.name} 
            className="max-h-96 max-w-full object-contain"
          />
        </div>
      );
    }
    
    if (file.type.includes('pdf')) {
      return (
        <div className="h-96 w-full">
          <iframe src={file.url} className="w-full h-full" title={file.name} />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8">
        {getFileIcon()}
        <p className="mt-4 text-gray-500">Preview not available</p>
        <Button 
          onClick={() => onDownload && onDownload(file.id)}
          className="mt-4"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Download to view
        </Button>
      </div>
    );
  };
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setIsOpen(true)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">
                {formatSize(file.size)} • {new Date(file.dateModified).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {getFileIcon()}
              <span className="ml-2">{file.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="preview" className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger 
                  value="ocr" 
                  disabled={!isOCRSupported}
                  className="flex items-center"
                >
                  <Type className="mr-2 h-4 w-4" />
                  Extract Text (OCR)
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'preview' && isOCRSupported && !isProcessingOCR && !ocrResult && (
                <Button 
                  onClick={startOCRProcessing} 
                  variant="outline" 
                  size="sm"
                >
                  <Type className="mr-2 h-4 w-4" />
                  Extract Text
                </Button>
              )}
            </div>
                        
            <TabsContent value="preview" className="mt-0">
              {renderPreview()}
            </TabsContent>
            
            <TabsContent value="ocr" className="mt-0">
              {isProcessingOCR && !ocrResult ? (
                <div className="p-4">
                  <HybridOCRProcessor
                    fileId={file.id}
                    bucketFileId={file.bucketFileId}
                    fileUrl={file.url}
                    fileType={file.type.includes('image') ? 'image' : 'document'}
                    fileName={file.name}
                    onComplete={handleOCRComplete}
                  />
                </div>
              ) : ocrResult ? (
                <OCRResults 
                  result={{
                    text: ocrResult.text,
                    confidence: ocrResult.confidence,
                    pageCount: ocrResult.pageCount,
                    processingTime: ocrResult.processingTime,
                    documentName: file.name
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Type className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Extract Text from Document</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                    Use OCR (Optical Character Recognition) to extract text content from this document.
                    This works best with clear, high-quality text.
                  </p>
                  <Button onClick={startOCRProcessing}>
                    <Type className="mr-2 h-4 w-4" />
                    Start Text Extraction
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              <p>Owner: {file.owner.name}</p>
              <p>Modified: {new Date(file.dateModified).toLocaleString()}</p>
              <p>Size: {formatSize(file.size)}</p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDownload && onDownload(file.id)}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onShare && onShare(file.id)}
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  onDelete && onDelete(file.id);
                  setIsOpen(false);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 