import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID, Query } from 'node-appwrite';
import { sendFileSharedNotification } from '@/lib/actions/email.actions';

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  // Important: First perform a truly asynchronous operation before accessing context.params
  try {
    // Get the current user first - this is a true async operation
    const currentUser = await getCurrentUser();
    
    // Now we can safely use context.params
    const fileId = context.params.id;
    
    // Now read the request body
    const { emails, users, departments, role = 'viewer', shareAsDepartment = false } = await request.json();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    
    // Get the file
    let file;
    try {
      file = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
    } catch (error) {
      console.error('Error fetching file:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has permission to share the file
    if (file.ownerId !== currentUser.$id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('Processing share request:', { 
      fileId, 
      emails: Array.isArray(emails) ? emails : [emails],
      departments: departments || [],
      role
    });

    // Initialize the array of users to share with
    let userIds: string[] = [];
    let departmentIds: string[] = [];
    
    // Handle sharing with specific users by email
    if (emails && emails.length > 0) {
      try {
        // Ensure emails is treated as an array
        const emailList = Array.isArray(emails) ? emails : [emails];
        console.log('Looking up users by emails:', emailList);
        
        // Get users by email
        for (const email of emailList) {
          const usersResult = await databases.listDocuments(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            [Query.equal('email', email)]
          );
          
          if (usersResult.documents.length > 0) {
            console.log('Found user for email', email, ':', usersResult.documents[0].$id);
            // Check if this is explicitly shared (via email) with the current user
            const isExplicitlySharingWithSelf = 
              email === currentUser.email && 
              usersResult.documents[0].$id === currentUser.$id;
            
            // Store the user IDs whether it's the current user or not when explicitly shared
            userIds.push(usersResult.documents[0].$id);
          } else {
            console.log('No user found for email:', email);
          }
        }
      } catch (error) {
        console.error('Error finding users by email:', error);
      }
    }
    
    // Handle sharing with specific users by ID
    if (users && users.length > 0) {
      console.log('Adding users by ID:', users);
      userIds = [...new Set([...userIds, ...users])]; // Combine and deduplicate
    }
    
    // Handle sharing with departments
    if (departments && departments.length > 0) {
      departmentIds = [...departments];
      console.log('Sharing with departments:', departmentIds, 'as entities:', shareAsDepartment);
      
      // If not sharing as a department (i.e., sharing with all members of the department)
      if (!shareAsDepartment) {
        let departmentUserIds: string[] = [];
        try {
          // For each department, get all users
          for (const deptId of departments) {
            console.log('Finding users in department:', deptId);
            const deptUsers = await databases.listDocuments(
              fullConfig.databaseId,
              fullConfig.usersCollectionId,
              [Query.equal('departmentId', deptId)]
            );
            
            const deptUserIds = deptUsers.documents.map(user => user.$id);
            console.log(`Found ${deptUserIds.length} users in department ${deptId}`);
            
            departmentUserIds = [
              ...departmentUserIds,
              ...deptUserIds
            ];
          }
          
          // Combine all user IDs and remove duplicates
          userIds = [...new Set([...userIds, ...departmentUserIds])];
        } catch (error) {
          console.error('Error finding department users:', error);
        }
      }
    }
    
    // Only filter out the owner if they weren't explicitly included in the emails list
    if (emails?.length > 0 && !emails.includes(currentUser.email)) {
      // Ensure we don't include the owner in the shared list unless explicitly requested
      userIds = userIds.filter(id => id !== currentUser.$id);
    }
    console.log('Final user IDs to share with:', userIds);
    
    if (userIds.length === 0 && departmentIds.length === 0) {
      console.log('No valid users or departments found to share with');
      return NextResponse.json({ 
        warning: 'No valid users or departments found to share with' 
      }, { status: 200 });
    }

    // Update file with shared users and permissions
    try {
      console.log('Updating file sharing permissions...');
      
      // First get the current shared list to avoid overwriting
      const existingFile = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      
      // Combine existing shared users with new users
      const existingSharedWith = existingFile.sharedWith || [];
      const combinedUserIds = [...new Set([...existingSharedWith, ...userIds])];
      
      console.log('Existing shared users:', existingSharedWith);
      console.log('New users to add:', userIds);
      console.log('Combined unique users:', combinedUserIds);
      
      const updateData: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      
      if (combinedUserIds.length > 0) {
        updateData.sharedWith = combinedUserIds;
      }
      
      if (shareAsDepartment && departmentIds.length > 0) {
        updateData.sharedWithDepartments = departmentIds;
      }
      
      console.log('Updating with data:', updateData);
      
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId,
        updateData
      );
      
      console.log('File sharing updated successfully');
      
      // Send email notifications to recipients
      if (emails && emails.length > 0) {
        console.log('Sending email notifications to recipients...');
        const emailList = Array.isArray(emails) ? emails : [emails];
        
        for (const email of emailList) {
          if (email !== currentUser.email) { // Don't notify the sharer
            try {
              await sendFileSharedNotification(
                email,
                file.name,
                currentUser.fullName || currentUser.email,
                fileId
              );
            } catch (emailError) {
              console.error(`Failed to send notification to ${email}:`, emailError);
              // Continue with other emails even if one fails
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating file sharing:', error);
      return NextResponse.json({ error: 'Failed to update file sharing' }, { status: 500 });
    }

    // Log the share activity
    try {
      // Create a descriptive message
      const shareDescription = buildShareDescription(
        file.name, 
        emails, 
        users, 
        departments, 
        shareAsDepartment
      );
      
      console.log('Logging activity:', shareDescription);
      
      // Check if activity logs collection exists first
      try {
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.activityLogsCollectionId,
          ID.unique(),
          {
            userId: currentUser.$id,
            type: 'SHARE_FILE',
            description: shareDescription,
            fileId: fileId,
            timestamp: new Date().toISOString()
          }
        );
        
        console.log('Activity logged successfully');
      } catch (logError: any) {
        // If collection doesn't exist, handle gracefully
        console.error(`Failed to log activity: ${logError.message}`);
        // Don't throw error to allow the share operation to complete
      }
    } catch (error) {
      console.error('Error preparing activity log:', error);
      // Continue even if logging fails
    }

    console.log('Share operation completed successfully');
    return NextResponse.json({ 
      success: true, 
      sharedWith: userIds.length,
      sharedWithDepartments: departmentIds.length
    });
  } catch (error: any) {
    console.error('Error in file sharing process:', error);
    return NextResponse.json(
      { error: 'Failed to share file. Error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

// Helper function to build a description of the share action
function buildShareDescription(
  fileName: string, 
  emails?: string[], 
  users?: string[], 
  departments?: string[], 
  shareAsDepartment: boolean = false
) {
  const parts = [`Shared file: ${fileName}`];
  
  if (emails && emails.length) {
    parts.push(`with emails: ${emails.join(', ')}`);
  }
  
  if (users && users.length) {
    parts.push(`with ${users.length} users`);
  }
  
  if (departments && departments.length) {
    if (shareAsDepartment) {
      parts.push(`with ${departments.length} departments as entities`);
    } else {
      parts.push(`with members of ${departments.length} departments`);
    }
  }
  
  return parts.join(' ');
} 