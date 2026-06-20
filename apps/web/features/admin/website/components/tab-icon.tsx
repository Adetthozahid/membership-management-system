import {
  FileText,
  Globe2,
  IdCard,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquareQuote,
  Settings,
} from "lucide-react";
import type { Tab } from "../types";

type TabIconProps = {
  tab: Tab;
};

export function TabIcon({ tab }: TabIconProps) {
  if (tab === "id-card")
    return <IdCard className="h-4 w-4" aria-hidden="true" />;
  if (tab === "navigation")
    return <Globe2 className="h-4 w-4" aria-hidden="true" />;
  if (tab === "pages")
    return <LayoutTemplate className="h-4 w-4" aria-hidden="true" />;
  if (tab === "hero")
    return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
  if (tab === "voices")
    return <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />;
  if (tab === "gallery")
    return <FileText className="h-4 w-4" aria-hidden="true" />;
  return <Settings className="h-4 w-4" aria-hidden="true" />;
}
