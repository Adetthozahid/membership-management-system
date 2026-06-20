import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Forbidden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>Your account does not have permission to open that area.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to overview</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
