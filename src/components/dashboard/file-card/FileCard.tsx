'use client';
import { FC } from 'react';
import { File } from '@/types/file';
import { FileIcon, MoreVertical, Download, Share, Trash } from 'lucide-react';
import { formatDistance } from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileCardProps {
  file: File;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onDownload: (id: string) => void;
}

export const FileCard: FC<FileCardProps> = ({ file, onDelete, onShare, onDownload }) => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-red-100 p-2 rounded">
              <FileIcon className="text-red-500 h-8 w-8" />
            </div>
            <div>
              <h3 className="font-medium text-sm truncate max-w-[150px]">{file.name}</h3>
              <p className="text-xs text-gray-500">
                {formatDistance(new Date(file.updatedAt), new Date(), { addSuffix: true })}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDownload(file.id)}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(file.id)}>
                <Share className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(file.id)} className="text-red-500">
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
      <CardFooter className="px-4 py-2 text-xs text-gray-500 border-t">
        {file.size}
      </CardFooter>
    </Card>
  );
};