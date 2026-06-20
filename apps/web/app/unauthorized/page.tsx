import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Unauthorized</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>Your session is missing or expired.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/login">Admin login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/login">Member login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
