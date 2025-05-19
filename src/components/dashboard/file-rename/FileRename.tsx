import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit3, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileRenameDialogProps {
  file: {
    id: string;
    name: string;
    extension?: string;
    type: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (fileId: string, newName: string, extension: string) => Promise<void>;
}

export function FileRenameDialog({ file, isOpen, onClose, onRename }: FileRenameDialogProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileExtension, setFileExtension] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (file && isOpen) {
      // Parse the current filename to separate name and extension
      const lastDotIndex = file.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        const nameWithoutExt = file.name.substring(0, lastDotIndex);
        const ext = file.name.substring(lastDotIndex + 1);
        setNewFileName(nameWithoutExt);
        setFileExtension(ext);
      } else {
        // No extension found
        setNewFileName(file.name);
        setFileExtension('');
      }
      setError('');
    }
  }, [file, isOpen]);

  const validateFileName = (name: string) => {
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return 'File name contains invalid characters';
    }
    
    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(name)) {
      return 'File name is a reserved system name';
    }
    
    // Check length
    if (name.length === 0) {
      return 'File name cannot be empty';
    }
    
    if (name.length > 255) {
      return 'File name is too long';
    }
    
    // Check for leading/trailing spaces or dots
    if (name.startsWith(' ') || name.endsWith(' ') || name.startsWith('.') || name.endsWith('.')) {
      return 'File name cannot start or end with spaces or dots';
    }
    
    return null;
  };

  const handleRename = async () => {
    if (!file) return;

    const trimmedName = newFileName.trim();
    const validationError = validateFileName(trimmedName);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if the name actually changed
    const currentNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    if (trimmedName === currentNameWithoutExt && fileExtension === (file.extension || '')) {
      toast.info('No changes made to the file name');
      onClose();
      return;
    }

    try {
      setIsRenaming(true);
      setError('');
      
      await onRename(file.id, trimmedName, fileExtension);
      
      toast.success('File renamed successfully');
      onClose();
    } catch (error: any) {
      console.error('Error renaming file:', error);
      setError(error.message || 'Failed to rename file');
      toast.error('Failed to rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRenaming) {
      handleRename();
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'image':
        return '🖼️';
      case 'document':
        return '📄';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      default:
        return '📁';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Rename File
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {file && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-lg">{getFileIcon(file.type)}</span>
                <span className="font-medium">Current name:</span>
                <span className="font-mono bg-white px-2 py-1 rounded border">
                  {file.name}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => {
                  setNewFileName(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter new file name"
                className={error ? 'border-red-500' : ''}
                autoFocus
              />
            </div>

            {fileExtension && (
              <div className="space-y-2">
                <Label htmlFor="extension">File Extension</Label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">.</span>
                  <Input
                    id="extension"
                    value={fileExtension}
                    onChange={(e) => {
                      setFileExtension(e.target.value);
                      setError('');
                    }}
                    placeholder="ext"
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Changing the extension may affect how the file opens
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {newFileName && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">New name:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {newFileName}{fileExtension ? `.${fileExtension}` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={isRenaming || !newFileName.trim()}
          >
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}