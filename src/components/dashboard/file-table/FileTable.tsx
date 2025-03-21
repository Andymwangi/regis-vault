'use client';
import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Download, 
  Share2, 
  Trash, 
  File, 
  FileText, 
  FileImage,
  FileSpreadsheet
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastModified: Date;
  size: number;
  shared?: boolean;
}

interface FileTableProps {
  files: FileItem[];
  showOwner?: boolean;
  onDownload?: (fileId: string) => void;
  onShare?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onSelect?: (selectedFiles: string[]) => void;
}

export function FileTable({ 
  files, 
  showOwner = true,
  onDownload, 
  onShare, 
  onDelete,
  onSelect
}: FileTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const toggleRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id) 
        : [...prev, id]
    );
    
    if (onSelect) {
      const newSelection = selectedRows.includes(id)
        ? selectedRows.filter(rowId => rowId !== id)
        : [...selectedRows, id];
      
      onSelect(newSelection);
    }
  };
  
  const toggleAll = () => {
    setSelectedRows(prev => 
      prev.length === files.length ? [] : files.map(file => file.id)
    );
    
    if (onSelect) {
      onSelect(selectedRows.length === files.length ? [] : files.map(file => file.id));
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <FileImage className="h-4 w-4 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    if (fileType.includes('document') || fileType.includes('word')) {
      return <FileText className="h-4 w-4 text-blue-700" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const fileDate = new Date(date);
    
    // If today
    if (fileDate.toDateString() === now.toDateString()) {
      return fileDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year
    if (fileDate.getFullYear() === now.getFullYear()) {
      return fileDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // If different year
    return fileDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedRows.length === files.length && files.length > 0}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {showOwner && <TableHead>Owner</TableHead>}
            <TableHead>Last Modified</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showOwner ? 6 : 5} className="text-center py-6 text-gray-500">
                No files found
              </TableCell>
            </TableRow>
          ) : (
            files.map(file => (
              <TableRow key={file.id} className="group">
                <TableCell>
                  <Checkbox 
                    checked={selectedRows.includes(file.id)}
                    onCheckedChange={() => toggleRow(file.id)}
                    aria-label={`Select ${file.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file.type)}
                    <span className="truncate max-w-xs">{file.name}</span>
                  </div>
                </TableCell>
                {showOwner && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {file.owner.avatar ? (
                        <img 
                          src={file.owner.avatar} 
                          alt={file.owner.name} 
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          {file.owner.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm">{file.owner.name}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>{formatDate(file.lastModified)}</TableCell>
                <TableCell>{formatSize(file.size)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload && onDownload(file.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare && onShare(file.id)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete && onDelete(file.id)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}