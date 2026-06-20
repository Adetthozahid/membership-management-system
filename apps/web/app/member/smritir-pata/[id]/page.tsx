import { BlogPostEditor } from "@/components/admin/blog-post-editor";

export default function EditMemberSmritirPataPage({
  params,
}: {
  params: { id: string };
}) {
  return <BlogPostEditor mode="member" postId={params.id} />;
}
