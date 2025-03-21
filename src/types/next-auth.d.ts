import { UserRole } from './user';
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      firstName: string;
      lastName: string;
      role: UserRole;
      department: string;
      phoneNumber?: string;
      avatarUrl?: string;
      createdAt?: Date;
      emailVerified: boolean;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    department: string;
  }
} 