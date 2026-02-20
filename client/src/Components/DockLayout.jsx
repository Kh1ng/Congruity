import React, { useEffect, useMemo, useState } from "react";

export const DEFAULT_DOCK_PRESET = {
  id: "default",
  root: {
    type: "split",
    direction: "horizontal",
    gap: 12,
    sizes: ["320px", "1fr", "300px"],
    children: [
      { type: "region", id: "leftDock" },
      { type: "region", id: "workspace" },
      { type: "region", id: "rightDock" },
    ],
  },
};

function DockRegion({ id, className = "", children }) {
  return (
    <div
      data-dock-region={id}
      className={`min-h-0 min-w-0 ${className}`}
    >
      {children}
    </div>
  );
}

function DockSplit({ direction = "horizontal", sizes, gap = 12, children }) {
  const isHorizontal = direction !== "vertical";
  const count = React.Children.count(children);
  const template = sizes?.length ? sizes.join(" ") : `repeat(${count}, minmax(0, 1fr))`;
  const style = isHorizontal
    ? { gridTemplateColumns: template }
    : { gridTemplateRows: template };

  return (
    <div
      className="grid min-h-0 min-w-0 h-full"
      style={{ ...style, gap }}
    >
      {children}
    </div>
  );
}

function DockStack({ items = [], defaultActiveId, className = "" }) {
  const initial = useMemo(() => {
    if (defaultActiveId) return defaultActiveId;
    return items[0]?.id || null;
  }, [defaultActiveId, items]);

  const [activeId, setActiveId] = useState(initial);

  useEffect(() => {
    if (!activeId && initial) {
      setActiveId(initial);
      return;
    }
    if (activeId && !items.some((item) => item.id === activeId)) {
      setActiveId(initial);
    }
  }, [activeId, initial, items]);

  const activeItem = items.find((item) => item.id === activeId) || items[0];

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap gap-2 text-xs">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className={`rounded px-3 py-1 border text-xs transition ${
              item.id === activeItem?.id
                ? "border-gruvbox-orange text-gruvbox-orange bg-slate-900/60"
                : "border-slate-800 text-slate-400 hover:text-gruvbox-orange"
            }`}
          >
            {item.label || item.title || item.id}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{activeItem?.content || null}</div>
    </div>
  );
}

function DockLayout({ layout = DEFAULT_DOCK_PRESET, regions = {}, className = "" }) {
  const rootNode = layout?.root || layout;

  const renderRegion = (id) => {
    if (!id) return null;
    if (typeof regions[id] === "function") {
      return regions[id]();
    }
    return regions[id] || null;
  };

  const renderNode = (node, index) => {
    if (!node) return null;
    if (node.type === "region") {
      return (
        <DockRegion key={node.id || index} id={node.id}>
          {renderRegion(node.id)}
        </DockRegion>
      );
    }
    if (node.type === "stack") {
      const items = (node.items || []).map((item) => ({
        ...item,
        content: item.content || renderRegion(item.regionId),
      }));
      return (
        <DockStack
          key={node.id || index}
          items={items}
          defaultActiveId={node.defaultActiveId}
          className={node.className}
        />
      );
    }
    if (node.type === "split") {
      return (
        <DockSplit
          key={node.id || index}
          direction={node.direction}
          sizes={node.sizes}
          gap={node.gap}
        >
          {(node.children || []).map((child, childIndex) =>
            renderNode(child, childIndex)
          )}
        </DockSplit>
      );
    }

    return null;
  };

  return (
    <div className={`min-h-0 min-w-0 h-full ${className}`}>
      {renderNode(rootNode)}
    </div>
  );
}

export { DockLayout, DockRegion, DockSplit, DockStack };

export default DockLayout;
