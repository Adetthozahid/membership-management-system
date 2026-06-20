import { BlogPostEditor } from "@/components/admin/blog-post-editor";

export default function EditSmritirPataPostPage({
  params,
}: {
  params: { id: string };
}) {
  return <BlogPostEditor postId={params.id} />;
}
