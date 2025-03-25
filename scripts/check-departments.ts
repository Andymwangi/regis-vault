import { db } from "@/lib/db/db";
import { departments } from "@/server/db/schema/schema";

async function checkDepartments() {
  try {
    const results = await db.query.departments.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
      }
    });
    console.log('Departments in database:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error checking departments:', error);
  }
  process.exit(0);
}

checkDepartments(); 