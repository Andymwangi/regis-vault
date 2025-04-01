'use server';

import { NextRequest, NextResponse } from "next/server";
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from "@/lib/db";
import { files, users } from "@/server/db/schema/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get the current user using Appwrite
    const currentUser = await account.get();
    
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get user profile data
    const userProfiles = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [
        Query.equal('userId', sanitizeUserId(currentUser.$id))
      ]
    );
    
    if (userProfiles.documents.length === 0) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }
    
    const userProfile = userProfiles.documents[0];

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const offset = (page - 1) * limit;

    // Base query conditions
    const conditions = [
      eq(files.status, 'active'),
      or(
        eq(files.userId, sql`${currentUser.$id}`),
        eq(files.status, 'public')
      )
    ];

    // Add type filter if provided
    if (type) {
      conditions.push(eq(files.type, type));
    }

    // Add search filter if provided
    if (search) {
      conditions.push(sql`LOWER(${files.name}) LIKE LOWER(${'%' + search + '%'})`);
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(...conditions));

    // Get files with pagination
    const results = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        size: files.size,
        url: files.url,
        thumbnailUrl: files.thumbnailUrl,
        status: files.status,
        updatedAt: files.updatedAt,
        createdAt: files.createdAt,
        owner: {
          id: users.id,
          name: users.name,
        },
      })
      .from(files)
      .leftJoin(users, eq(files.userId, sql`${users.id}::uuid`))
      .where(and(...conditions))
      .orderBy(desc(files.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      files: results,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { message: "Failed to fetch files" },
      { status: 500 }
    );
  }
} 