import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/global/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b p-4 flex justify-between items-center">
        <span className="font-bold">Dashboard</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}