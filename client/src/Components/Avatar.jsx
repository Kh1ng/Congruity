import React, { useState } from "react";

const sizeClasses = {
  sm: "h-6 w-6 text-[0.6rem]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-12 w-12 text-base",
};

const statusColors = {
  online: "bg-green-500",
  idle: "bg-yellow-500",
  dnd: "bg-red-500",
  offline: "bg-gray-500",
};

const fallbackPalette = [
  "#458588",
  "#689d6a",
  "#b16286",
  "#d79921",
  "#d65d0e",
  "#98971a",
];

function getInitials(name) {
  if (!name || !name.trim()) return "?";
  
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name = "", src, size = "md", status, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const showImage = src && !imgError;
  const hash = Array.from(String(name)).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const fallbackBg = fallbackPalette[hash % fallbackPalette.length];

  return (
    <div
      data-testid="avatar"
      className={`relative inline-flex items-center justify-center rounded-full bg-[color:var(--color-surface-alt)] border border-[color:var(--color-border)] font-semibold text-[color:var(--color-text)] ${sizeClasses[size]} ${className}`}
      style={!showImage ? { backgroundColor: fallbackBg } : undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
      
      {status && (
        <span
          data-testid="status-indicator"
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--color-bg)] ${statusColors[status] || statusColors.offline}`}
        />
      )}
    </div>
  );
}

export default Avatar;
