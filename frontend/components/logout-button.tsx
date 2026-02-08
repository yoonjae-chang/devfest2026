"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const isStudio = pathname.startsWith("/studio");
  const textColor = isStudio ? "text-gray-700" : "text-white";
  const bgColor = isStudio ? "bg-gray-800" : "bg-white";

  return <Button variant="glass" className={`${textColor} ${isStudio ? "bg-gray-400" : "bg-white"}`} size="sm" onClick={logout}>Logout</Button>;
}
