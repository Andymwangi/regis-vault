const fetch = require('node-fetch');

async function testDepartmentsApi() {
  try {
    console.log('Testing departments API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/departments');
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('API Response Body:', JSON.stringify(data, null, 2));
    
    if (data.departments && Array.isArray(data.departments)) {
      console.log(`Found ${data.departments.length} departments`);
      console.log('Test passed: Departments API is working correctly');
    } else {
      console.log('Test failed: No departments returned from API');
    }
  } catch (error) {
    console.error('Error testing departments API:', error);
    console.log('Make sure your Next.js development server is running on port 3000');
  }
}

testDepartmentsApi(); 