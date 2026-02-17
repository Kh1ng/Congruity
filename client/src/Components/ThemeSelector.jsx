import React from "react";

function ThemeSelector() {
  return (
    <div className="border-t border-slate-800 pt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Theme</h3>
      <div className="text-xs text-slate-400 mb-2">
        Theme selection is coming soon.
      </div>
      <select
        className="w-full bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
        disabled
      >
        <option>System (default)</option>
        <option>Dark</option>
        <option>Light</option>
      </select>
    </div>
  );
}

export default ThemeSelector;
