import React from "react";
import DockLayout, { DEFAULT_DOCK_PRESET } from "./DockLayout";

function AppShell({ layout, regions }) {
  return (
    <DockLayout
      layout={layout || DEFAULT_DOCK_PRESET}
      regions={regions}
      className="h-full min-h-0"
    />
  );
}

export default AppShell;
