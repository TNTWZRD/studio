import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="container mx-auto flex h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
      <ShieldAlert className="w-16 h-16 text-destructive" />
      <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl font-headline">
        Access Denied
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        You do not have the required role to access this website. Please join our Discord server and ensure you have the 'Member' role to log in.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    </div>
  );
}
