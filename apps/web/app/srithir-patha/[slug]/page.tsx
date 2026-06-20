import { redirect } from "next/navigation";

export default async function SrithirPathaDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/smritir-pata/${params.slug}`);
}
