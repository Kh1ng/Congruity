import React from "react";

function Spinner({ size = 16 }) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-slate-600 border-t-gruvbox-orange"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

export default Spinner;
