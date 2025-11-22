import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-6xl font-bold tracking-tighter">Universal Vibe Starter</h1>
      <p className="text-muted-foreground">Next.js 16 • Supabase • Inngest • Modular Services</p>
      <div className="flex gap-4">
        <Link href="/auth/login" className="px-6 py-3 border rounded-lg hover:bg-accent transition">
          Login
        </Link>
        <Link href="/auth/signup" className="px-6 py-3 border rounded-lg hover:bg-accent transition">
          Sign Up
        </Link>
      </div>
    </div>
  );
}