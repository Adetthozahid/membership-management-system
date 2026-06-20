export function WebsitePageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Website
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Website Control
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage public website identity, SEO, navigation, and page content
          from the admin area.
        </p>
      </div>
    </div>
  );
}
