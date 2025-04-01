# Authentication Migration

## Migrating from Next Auth to Appwrite

This project has migrated from Next Auth to Appwrite for authentication. The `auth-options.ts` file remains as a compatibility layer for routes that still import from it, but the actual authentication is now handled by Appwrite.

## How to Update Routes

To update a route from Next Auth to Appwrite:

1. Replace imports:

   ```typescript
   // OLD - Using Next Auth
   import { getServerSession } from "next-auth";
   import { authOptions } from "@/lib/auth/auth-options";

   // NEW - Using Appwrite
   import { account, getUserProfileById } from "@/lib/appwrite/config";
   ```

2. Replace authentication check:

   ```typescript
   // OLD - Using Next Auth
   const session = await getServerSession(authOptions);
   if (!session?.user?.id) {
     return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
   }

   // NEW - Using Appwrite
   try {
     const user = await account.get();

     // For admin-only routes, add role verification:
     const userProfileData = await getUserProfileById(user.$id);
     if (!userProfileData || userProfileData.profile.role !== "admin") {
       return NextResponse.json(
         { message: "Forbidden: Admin access required" },
         { status: 403 }
       );
     }
   } catch (error) {
     return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
   }
   ```

3. Update database imports if needed:

   ```typescript
   // OLD
   import { db } from "@/lib/db/db";

   // NEW
   import { db } from "@/lib/db";
   ```

## Remaining Files to Update

The following files still need to be updated to use Appwrite:

- `src/app/api/files/[id]/restore/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/storage/trends/route.ts`
- `src/app/api/admin/storage/file-types/route.ts`

Once all routes have been migrated, the `src/lib/auth/auth-options.ts` file can be removed.
