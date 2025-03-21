'use client';

import { FC } from 'react';
import { File } from '@/types/file';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Share2, RotateCcw } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils/format';

interface FileTableProps {
  files: File[];
  showOwner?: boolean;
  showDepartment?: boolean;
  showDeletedBy?: boolean;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onShare?: (fileId: string) => void;
  onRestore?: (fileId: string) => void;
  onPermanentDelete?: (fileId: string) => void;
  customActions?: Array<{
    icon: any;
    label: string;
    onClick: (fileId: string) => void;
    className?: string;
  }>;
}

export const FileTable: FC<FileTableProps> = ({
  files,
  showOwner = false,
  showDepartment = false,
  showDeletedBy = false,
  onDownload,
  onDelete,
  onShare,
  onRestore,
  onPermanentDelete,
  customActions,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Last Modified</TableHead>
          {showOwner && <TableHead>Owner</TableHead>}
          {showDepartment && <TableHead>Department</TableHead>}
          {showDeletedBy && <TableHead>Deleted By</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id}>
            <TableCell className="font-medium">{file.name}</TableCell>
            <TableCell>{file.type}</TableCell>
            <TableCell>{formatFileSize(file.size)}</TableCell>
            <TableCell>{formatDate(file.updatedAt)}</TableCell>
            {showOwner && (
              <TableCell>
                {file.owner?.firstName} {file.owner?.lastName}
              </TableCell>
            )}
            {showDepartment && (
              <TableCell>{file.department?.name}</TableCell>
            )}
            {showDeletedBy && (
              <TableCell>
                {file.deletedBy?.firstName} {file.deletedBy?.lastName}
              </TableCell>
            )}
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownload(file.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {onShare && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onShare(file.id)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {onRestore && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRestore(file.id)}
                  >
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                  </Button>
                )}
                {onPermanentDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPermanentDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
                {customActions?.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    onClick={() => action.onClick(file.id)}
                    className={action.className}
                  >
                    <action.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};