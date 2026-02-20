import React, { useEffect, useMemo, useState } from "react";

function RightDock({ tabs = [], defaultTabId }) {
  const initialTab = useMemo(() => {
    if (defaultTabId) return defaultTabId;
    return tabs[0]?.id || null;
  }, [defaultTabId, tabs]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!activeTab && initialTab) {
      setActiveTab(initialTab);
      return;
    }
    if (activeTab && !tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(initialTab);
    }
  }, [activeTab, initialTab, tabs]);

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-3 py-1 border text-xs transition ${
              tab.id === currentTab?.id
                ? "border-gruvbox-orange text-gruvbox-orange bg-slate-900/60"
                : "border-slate-800 text-slate-400 hover:text-gruvbox-orange"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {currentTab?.content || null}
      </div>
    </div>
  );
}

export default RightDock;
