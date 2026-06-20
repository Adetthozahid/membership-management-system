type AdminMessageProps = {
  message: string | null;
};

export function AdminMessage({ message }: AdminMessageProps) {
  if (!message) return null;
  return <div className="rounded-md border bg-muted p-3 text-sm">{message}</div>;
}
