"use client";

import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegistrationSuccessPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PublicPageHeader
        eyebrow="Registration"
        title="Application Received by Sociology Alumni Association of SUST"
        subtitle="Your membership application has been submitted successfully."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2
              className="h-5 w-5 text-green-600"
              aria-hidden="true"
            />
            Registration completed successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3 rounded-md border bg-muted p-4">
            <MailCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Please check your inbox.
              </p>
              <p className="text-muted-foreground">
                We have sent the next instructions to your email address. If you
                do not see the email, please check your spam or junk folder.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/">Done</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
