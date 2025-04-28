export type FileType = "document" | "image" | "pdf" | "spreadsheet" | "other";
export type FileStatus = 'active' | 'deleted' | 'shared';
export type FilePermission = "view" | "edit" | "admin";

export interface FileOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface FileShare {
  userId: string;
  user: FileOwner;
  permission: 'read' | 'write';
  createdAt: string;
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  ownerId: string;
  departmentId?: string;
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  bucketFieldId?: string;
  bucketFileId?: string;
  extension?: string;
  sharedWith?: string[];
  owner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  department?: {
    name: string;
  };
  deletedBy?: {
    firstName: string;
    lastName: string;
  };
  ext?: string;
  isShared?: boolean;
}

export interface FileUploadResponse {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface FileSearchParams {
  query: string;
  type?: FileType;
  status?: FileStatus;
  ownerId?: string;
  sharedWith?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "name" | "date" | "size";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface FileSearchResponse {
  files: File[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
