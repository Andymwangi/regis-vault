import { NextRequest, NextResponse } from "next/server";
import { account } from "@/lib/appwrite/config";
import { databases, DATABASES, COLLECTIONS, ID } from "@/lib/appwrite/config";
import { db } from "@/lib/db";
import { departments } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import { getDepartmentStats } from "@/lib/appwrite/department-files";

// GET all departments
export async function GET(request: NextRequest) {
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

    // Get departments from PostgreSQL for detailed information
    const pgDepartments = await db.query.departments.findMany({
      orderBy: (dept, { asc }) => [asc(dept.name)],
    });

    // Enhance each department with usage statistics from Appwrite
    const enhancedDepartments = await Promise.all(
      pgDepartments.map(async (department) => {
        try {
          // Get usage stats from Appwrite
          const stats = await getDepartmentStats(department.id);
          
          return {
            ...department,
            stats,
          };
        } catch (error) {
          console.error(`Error getting stats for department ${department.id}:`, error);
          
          // Return department without stats if there's an error
          return {
            ...department,
            stats: {
              totalFiles: 0,
              totalUsers: 0,
              totalStorageBytes: 0,
              totalStorageMB: 0,
              fileTypeCount: {},
            },
          };
        }
      })
    );

    return NextResponse.json(enhancedDepartments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { message: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST to create a new department
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    try {
      const userAccount = await account.get();
      
      // Get user profile to check role
      const usersResult = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        []
      );
      
      const user = usersResult.documents.find(u => u.userId === userAccount.$id);
      
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { message: "Unauthorized - Admin access required" },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { message: "Department name is required" },
        { status: 400 }
      );
    }

    // Create department in PostgreSQL
    const [newDepartment] = await db.insert(departments).values({
      name: data.name,
      description: data.description || '',
      allocatedStorage: data.allocatedStorage || 0,
    }).returning();

    // Create department in Appwrite for easier querying
    await databases.createDocument(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      ID.unique(),
      {
        departmentId: newDepartment.id,
        name: newDepartment.name,
        description: newDepartment.description || '',
        allocatedStorage: newDepartment.allocatedStorage || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      message: "Department created successfully",
      department: newDepartment,
    });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { message: "Failed to create department" },
      { status: 500 }
    );
  }
}

// PUT to update a department
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    try {
      const userAccount = await account.get();
      
      // Get user profile to check role
      const usersResult = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        []
      );
      
      const user = usersResult.documents.find(u => u.userId === userAccount.$id);
      
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { message: "Unauthorized - Admin access required" },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.id || !data.name) {
      return NextResponse.json(
        { message: "Department ID and name are required" },
        { status: 400 }
      );
    }

    // Update department in PostgreSQL
    const [updatedDepartment] = await db.update(departments)
      .set({
        name: data.name,
        description: data.description,
        allocatedStorage: data.allocatedStorage,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, data.id))
      .returning();

    // Find and update department in Appwrite
    // First need to find the Appwrite document ID
    const appwriteDepartments = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      []
    );
    
    const appwriteDept = appwriteDepartments.documents.find(
      d => d.departmentId === data.id
    );
    
    if (appwriteDept) {
      await databases.updateDocument(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        appwriteDept.$id,
        {
          name: data.name,
          description: data.description || '',
          allocatedStorage: data.allocatedStorage || 0,
          updatedAt: new Date().toISOString(),
        }
      );
    }

    return NextResponse.json({
      message: "Department updated successfully",
      department: updatedDepartment,
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { message: "Failed to update department" },
      { status: 500 }
    );
  }
} 