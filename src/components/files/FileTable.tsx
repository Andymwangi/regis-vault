import type { File } from '@/types/file';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Share2, Trash2, FileText, FileSpreadsheet, Presentation, FileIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface FileTableProps {
  files: File[];
  onDelete: (fileId: string) => void;
  onShare: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  loading: boolean;
}

export function FileTable({ files, onDelete, onShare, onDownload, loading }: FileTableProps) {
  const getFileIcon = (type: string) => {
    if (type.includes('document')) return <FileText className="h-4 w-4" />;
    if (type.includes('spreadsheet')) return <FileSpreadsheet className="h-4 w-4" />;
    if (type.includes('presentation')) return <Presentation className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No files found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {getFileIcon(file.type)}
                  {file.name}
                </div>
              </TableCell>
              <TableCell>{file.type}</TableCell>
              <TableCell>{file.size}</TableCell>
              <TableCell>{formatDate(file.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownload(file.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onShare(file.id)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(file.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 