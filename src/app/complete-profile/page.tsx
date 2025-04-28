import { redirect } from "next/navigation";
import ProfileCompletion from "@/components/profile/ProfileCompletion";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();
  
  // If user is not logged in, redirect to sign-in
  if (!user) {
    redirect("/sign-in");
  }
  
  // If user profile is already complete, redirect to dashboard
  if (user && !user.needsProfileCompletion) {
    redirect("/dashboard/files");
  }
  
  return <ProfileCompletion userId={user.$id} />;
} 