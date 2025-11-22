import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <form action={login} className="w-full max-w-sm space-y-4 border p-8 rounded-lg">
        <h1 className="text-2xl font-bold">Login</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">Sign In</Button>
        <p className="text-sm text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}