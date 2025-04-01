import { NextRequest, NextResponse } from "next/server";
import { storage, databases, DATABASES, COLLECTIONS, STORAGE_BUCKETS, ID } from "@/lib/appwrite/config";
import { account } from "@/lib/appwrite/config";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated with Appwrite
    try {
      await account.get();
    } catch (error) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files") as File[];
    const departmentId = formData.get("departmentId") as string;
    const userId = formData.get("userId") as string;

    if (!uploadedFiles.length) {
      return NextResponse.json(
        { message: "No files provided" },
        { status: 400 }
      );
    }

    if (!userId || !departmentId) {
      return NextResponse.json(
        { message: "User ID and Department ID are required" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      uploadedFiles.map(async (file) => {
        try {
          // Upload file to Appwrite Storage
          const fileUpload = await storage.createFile(
            STORAGE_BUCKETS.FILES,
            ID.unique(),
            file
          );

          // Create metadata record in Appwrite Database
          const fileMetadata = await databases.createDocument(
            DATABASES.MAIN,
            COLLECTIONS.FILES_METADATA,
            ID.unique(),
            {
              name: file.name,
              type: file.type,
              size: file.size,
              storageFileId: fileUpload.$id,
              userId: userId,
              departmentId: departmentId,
              status: 'active',
              url: storage.getFileView(STORAGE_BUCKETS.FILES, fileUpload.$id),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );

          // Log activity in Appwrite Database
          await databases.createDocument(
            DATABASES.MAIN,
            COLLECTIONS.FILES, // Using this for activity logs
            ID.unique(),
            {
              userId: userId,
              action: "FILE_UPLOADED",
              details: `Uploaded file: ${file.name}`,
              fileId: fileMetadata.$id,
              createdAt: new Date().toISOString(),
            }
          );

          return {
            success: true,
            file: {
              id: fileMetadata.$id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: fileMetadata.url,
            },
          };
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          return {
            success: false,
            error: `Failed to upload ${file.name}`,
          };
        }
      })
    );

    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    return NextResponse.json({
      message: "Files uploaded successfully",
      successfulUploads,
      failedUploads,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { message: "Failed to upload files" },
      { status: 500 }
    );
  }
} 