export function MemberEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border bg-card p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
