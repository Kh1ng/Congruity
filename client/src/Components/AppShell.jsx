import React from "react";
import DockLayout, { DEFAULT_DOCK_PRESET } from "./DockLayout";

function AppShell({ layout, regions }) {
  return (
    <DockLayout
      layout={layout || DEFAULT_DOCK_PRESET}
      regions={regions}
      className="h-[calc(100vh-240px)]"
    />
  );
}

export default AppShell;
