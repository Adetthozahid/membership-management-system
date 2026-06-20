import { MemberLayoutContent } from "@/components/member/member-layout-content";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberLayoutContent>{children}</MemberLayoutContent>;
}
