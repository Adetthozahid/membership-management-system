import { Button } from "@/components/ui/button";
import type { Tab } from "../types";
import { TabIcon } from "./tab-icon";

type WebsiteTabsProps = {
  activeTab: Tab;
  tabs: Array<{ id: Tab; label: string }>;
  onChange: (tab: Tab) => void;
};

export function WebsiteTabs({ activeTab, tabs, onChange }: WebsiteTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        return (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => onChange(tab.id)}
          >
            <TabIcon tab={tab.id} />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
