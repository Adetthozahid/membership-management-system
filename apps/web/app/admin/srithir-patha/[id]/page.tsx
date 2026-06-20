import { redirect } from "next/navigation";

export default function EditSrithirPathaPostPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/smritir-pata/${params.id}`);
}
