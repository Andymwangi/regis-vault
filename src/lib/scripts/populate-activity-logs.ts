import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { ID } from 'node-appwrite';

/**
 * This script populates the activity logs collection with sample data
 * Can be executed from a Next.js API route or manually through a utility endpoint
 */
export async function populateSampleActivityLogs(userId?: string) {
  try {
    const { databases } = await createAdminClient();
    
    console.log('Starting to populate sample activity logs');
    
    // If no userId provided, try to get a random user
    if (!userId) {
      try {
        const users = await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.usersCollectionId,
          []
        );
        
        if (users.documents.length > 0) {
          userId = users.documents[0].$id;
        } else {
          userId = 'sample-user';
        }
      } catch (error) {
        console.error('Error getting users:', error);
        userId = 'sample-user';
      }
    }
    
    // Generate activities over the past 30 days
    const activityTypes = [
      'FILE_UPLOAD',
      'FILE_DOWNLOAD',
      'FILE_VIEW',
      'FILE_DELETE',
      'FILE_RESTORE',
      'USER_LOGIN',
      'USER_LOGOUT'
    ];
    
    const now = new Date();
    const activities = [];
    
    // Generate 50 random activities
    for (let i = 0; i < 50; i++) {
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - randomDaysAgo);
      
      const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      let description = '';
      
      switch (randomType) {
        case 'FILE_UPLOAD':
          description = `Uploaded file: document_${i}.pdf`;
          break;
        case 'FILE_DOWNLOAD':
          description = `Downloaded file: document_${i}.pdf`;
          break;
        case 'FILE_VIEW':
          description = `Viewed file: document_${i}.pdf`;
          break;
        case 'FILE_DELETE':
          description = `Deleted file: document_${i}.pdf`;
          break;
        case 'FILE_RESTORE':
          description = `Restored file: document_${i}.pdf`;
          break;
        case 'USER_LOGIN':
          description = 'User logged in';
          break;
        case 'USER_LOGOUT':
          description = 'User logged out';
          break;
      }
      
      activities.push({
        userId: userId,
        type: randomType,
        description: description,
        createdAt: timestamp.toISOString(),
        fileId: randomType.includes('FILE') ? `sample-file-${i}` : null
      });
    }
    
    // Sort chronologically
    activities.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Create documents in the activity logs collection
    console.log(`Creating ${activities.length} sample activity logs`);
    
    for (const activity of activities) {
      try {
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.activityLogsCollectionId,
          ID.unique(),
          activity
        );
      } catch (error) {
        console.error('Error creating activity log:', error);
      }
    }
    
    console.log('Successfully populated sample activity logs');
    return {
      success: true,
      count: activities.length
    };
    
  } catch (error) {
    console.error('Failed to populate activity logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 