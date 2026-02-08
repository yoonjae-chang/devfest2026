import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="text-sm text-amber-600">
        Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local
      </div>
    );
  }

  let user: { email?: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims ?? null;
  } catch {
    // Supabase unreachable (fetch failed): show unauthenticated UI
  }

  return user ? (
    <div className="flex items-center text-sm gap-4">
      Hey, {user.email?.split("@")[0] ?? user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="glass">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="glass">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
