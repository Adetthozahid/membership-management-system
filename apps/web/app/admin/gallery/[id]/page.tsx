import { MediaEditPage } from "@/components/admin/media-edit-page";

export default function AdminGalleryMediaEditPage({ params }: { params: { id: string } }) {
  return <MediaEditPage id={params.id} />;
}
