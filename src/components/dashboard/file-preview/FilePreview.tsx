'use client';

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Trash, FileText, FileImage, FileSpreadsheet } from "lucide-react";

interface FilePreviewProps {
  file: {
    id: string;
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

export function FilePreview({ file, onDownload, onShare, onDelete }: FilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {getFileIcon()}
              <span className="ml-2">{file.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          {renderPreview()}
          
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