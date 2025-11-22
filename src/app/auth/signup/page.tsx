import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <form action={signUp} className="w-full max-w-sm space-y-4 border p-8 rounded-lg">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name (Optional)</Label>
          <Input id="name" name="name" type="text" />
        </div>
        <Button type="submit" className="w-full">Create Account</Button>
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

