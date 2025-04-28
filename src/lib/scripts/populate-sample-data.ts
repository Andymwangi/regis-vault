import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { ID } from 'node-appwrite';

/**
 * This script populates sample department data
 */
export async function populateSampleDepartments() {
  try {
    const { databases } = await createAdminClient();
    
    console.log('Starting to populate sample departments');
    
    // Sample departments
    const departments = [
      { 
        name: "Finance", 
        description: "Financial operations and reporting",
        allocatedStorage: 5 * 1024 * 1024 * 1024, // 5 GB
        memberCount: Math.floor(Math.random() * 20) + 10
      },
      { 
        name: "Marketing", 
        description: "Brand management and campaign execution",
        allocatedStorage: 10 * 1024 * 1024 * 1024, // 10 GB
        memberCount: Math.floor(Math.random() * 15) + 8
      },
      { 
        name: "HR", 
        description: "Human resources and personnel management",
        allocatedStorage: 3 * 1024 * 1024 * 1024, // 3 GB
        memberCount: Math.floor(Math.random() * 10) + 5
      },
      { 
        name: "Engineering", 
        description: "Product development and technical operations",
        allocatedStorage: 15 * 1024 * 1024 * 1024, // 15 GB
        memberCount: Math.floor(Math.random() * 30) + 20
      },
      { 
        name: "Sales", 
        description: "Sales operations and client management",
        allocatedStorage: 8 * 1024 * 1024 * 1024, // 8 GB
        memberCount: Math.floor(Math.random() * 25) + 15
      }
    ];
    
    // Create departments in the database
    const createdDepartments = [];
    
    for (const department of departments) {
      try {
        const newDepartment = await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.departmentsCollectionId,
          ID.unique(),
          {
            name: department.name,
            description: department.description,
            allocatedStorage: department.allocatedStorage,
            memberCount: department.memberCount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
        
        createdDepartments.push(newDepartment);
      } catch (error) {
        console.error(`Error creating department ${department.name}:`, error);
      }
    }
    
    console.log(`Successfully created ${createdDepartments.length} sample departments`);
    return {
      success: true,
      count: createdDepartments.length,
      departments: createdDepartments
    };
  } catch (error) {
    console.error('Failed to populate sample departments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * This script populates sample user activity data with department info
 */
export async function populateUserActivitiesWithDepartments() {
  try {
    const { databases } = await createAdminClient();
    
    console.log('Starting to populate sample user activities with department info');
    
    // First, get users
    let users = [];
    try {
      const usersResult = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        []
      );
      
      users = usersResult.documents;
      if (users.length === 0) {
        return {
          success: false,
          error: 'No users found to associate with activities'
        };
      }
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: 'Failed to get users for activity generation'
      };
    }
    
    // Next, get departments
    let departments = [];
    try {
      const departmentsResult = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.departmentsCollectionId,
        []
      );
      
      departments = departmentsResult.documents;
      if (departments.length === 0) {
        // Try to create departments first
        const deptResult = await populateSampleDepartments();
        if (deptResult.success && deptResult.departments) {
          departments = deptResult.departments;
        } else {
          return {
            success: false,
            error: 'No departments found and failed to create them'
          };
        }
      }
    } catch (error) {
      console.error('Error getting departments:', error);
      return {
        success: false,
        error: 'Failed to get departments for activity generation'
      };
    }
    
    // Generate file names for various departments
    const departmentFiles = {
      Finance: ['Q1_Report.pdf', 'Annual_Budget.xlsx', 'Tax_Documents.pdf', 'Expense_Report.csv'],
      Marketing: ['Campaign_Analytics.pptx', 'Brand_Guidelines.pdf', 'Social_Media_Assets.zip', 'Market_Research.docx'],
      HR: ['Employee_Handbook.pdf', 'Benefits_Overview.docx', 'Training_Materials.pptx', 'Recruitment_Plan.pdf'],
      Engineering: ['System_Architecture.pdf', 'Code_Repository.zip', 'Technical_Specs.docx', 'API_Documentation.md'],
      Sales: ['Client_Proposals.pdf', 'Sales_Forecast.xlsx', 'Customer_Database.csv', 'Contract_Templates.docx']
    };
    
    // Activity types with weighted probabilities
    const activityTypes = [
      { type: 'FILE_UPLOAD', weight: 10 },
      { type: 'FILE_DOWNLOAD', weight: 15 },
      { type: 'FILE_VIEW', weight: 20 },
      { type: 'FILE_DELETE', weight: 5 },
      { type: 'FILE_RESTORE', weight: 3 },
      { type: 'USER_LOGIN', weight: 8 },
      { type: 'USER_LOGOUT', weight: 8 }
    ];
    
    // Calculate weights for random selection
    const totalWeight = activityTypes.reduce((sum, type) => sum + type.weight, 0);
    const weightedTypes = [];
    
    for (const activity of activityTypes) {
      for (let i = 0; i < activity.weight; i++) {
        weightedTypes.push(activity.type);
      }
    }
    
    // Generate 100 random activities with department info
    const now = new Date();
    const activities = [];
    
    for (let i = 0; i < 100; i++) {
      // Random user
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Random department
      const department = departments[Math.floor(Math.random() * departments.length)];
      
      // Random date within last 30 days
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - randomDaysAgo);
      
      // Random activity type with weighting
      const randomType = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
      
      // Generate appropriate description based on activity type
      let description = '';
      let fileId = null;
      let fileName = '';
      
      // Get appropriate file names for the department
      const deptName = department.name || 'General';
      const deptFiles = departmentFiles[deptName as keyof typeof departmentFiles] || departmentFiles.Finance;
      
      if (randomType.includes('FILE')) {
        fileName = deptFiles[Math.floor(Math.random() * deptFiles.length)];
        fileId = `sample-file-${i}-${department.$id.slice(0, 5)}`;
      }
      
      switch (randomType) {
        case 'FILE_UPLOAD':
          description = `Uploaded file: ${fileName}`;
          break;
        case 'FILE_DOWNLOAD':
          description = `Downloaded file: ${fileName}`;
          break;
        case 'FILE_VIEW':
          description = `Viewed file: ${fileName}`;
          break;
        case 'FILE_DELETE':
          description = `Deleted file: ${fileName}`;
          break;
        case 'FILE_RESTORE':
          description = `Restored file: ${fileName}`;
          break;
        case 'USER_LOGIN':
          description = `User logged in - ${user.fullName || user.email}`;
          break;
        case 'USER_LOGOUT':
          description = `User logged out - ${user.fullName || user.email}`;
          break;
      }
      
      // Create activity object with department info
      activities.push({
        userId: user.$id,
        type: randomType,
        description,
        createdAt: timestamp.toISOString(),
        fileId: randomType.includes('FILE') ? fileId : null,
        departmentId: department.$id,
        metadata: JSON.stringify({
          browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
          os: ['Windows', 'MacOS', 'Linux', 'iOS'][Math.floor(Math.random() * 4)],
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        })
      });
    }
    
    // Sort chronologically
    activities.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Create documents in the activity logs collection
    console.log(`Creating ${activities.length} sample activities with department info`);
    
    const createdActivities = [];
    
    for (const activity of activities) {
      try {
        const newActivity = await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.activityLogsCollectionId,
          ID.unique(),
          activity
        );
        createdActivities.push(newActivity);
      } catch (error) {
        console.error('Error creating activity log:', error);
      }
    }
    
    console.log(`Successfully created ${createdActivities.length} sample activities with department info`);
    return {
      success: true,
      count: createdActivities.length
    };
    
  } catch (error) {
    console.error('Failed to populate activities with departments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 