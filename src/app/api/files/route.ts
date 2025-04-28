'use server';

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { fullConfig } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type") || "";
    const search = searchParams.get("search") || "";
    
    // Build Appwrite queries
    const queries = [
      Query.or([
        Query.equal("ownerId", [currentUser.$id]),
        Query.contains("sharedWith", [currentUser.$id])
      ])
    ];
    
    // Add type filter if provided and not 'all'
    if (type && type !== "all") {
      queries.push(Query.equal("type", [type]));
    }
    
    // Add search filter if provided
    if (search) {
      queries.push(Query.search("name", search));
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    
    // Order by most recent first
    queries.push(Query.orderDesc("$createdAt"));
    
    // Fetch files from Appwrite
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries
    );
    
    // Format the response
    return NextResponse.json({
      files: files.documents,
      total: files.total,
      page,
      limit,
      totalPages: Math.ceil(files.total / limit),
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { message: "Failed to fetch files" },
      { status: 500 }
    );
  }
} 