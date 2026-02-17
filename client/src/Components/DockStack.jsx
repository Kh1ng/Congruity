import React, { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SplitPane, { Pane } from "split-pane-react";
import "split-pane-react/esm/themes/default.css";

function DockPanel({ id, title, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full flex flex-col">
      <div
        className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-slate-400"
      >
        <span>{title}</span>
        <button
          type="button"
          className="cursor-grab text-slate-500 hover:text-gruvbox-orange"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${title} panel`}
        >
          <GripVertical size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-800 bg-slate-950/40 p-2 mt-1">
        {children}
      </div>
    </div>
  );
}

function normalizeOrder(panels, storedOrder) {
  const panelIds = panels.map((panel) => panel.id);
  const nextOrder = storedOrder
    ? storedOrder.filter((id) => panelIds.includes(id))
    : [];
  panelIds.forEach((id) => {
    if (!nextOrder.includes(id)) {
      nextOrder.push(id);
    }
  });
  return nextOrder;
}

function DockStack({ dockId, panels }) {
  const storageKey = `dock:${dockId}`;
  const panelMap = useMemo(
    () => new Map(panels.map((panel) => [panel.id, panel])),
    [panels]
  );

  const [order, setOrder] = useState(() => {
    const raw = localStorage.getItem(`${storageKey}:order`);
    try {
      const storedOrder = raw ? JSON.parse(raw) : null;
      return normalizeOrder(panels, storedOrder);
    } catch {
      return normalizeOrder(panels, null);
    }
  });

  const minPaneSize = 120;

  const [sizeById, setSizeById] = useState(() => {
    const raw = localStorage.getItem(`${storageKey}:sizes`);
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      const values = Object.values(parsed);
      const hasInvalid = values.some(
        (value) => typeof value !== "number" || Number.isNaN(value) || value < minPaneSize
      );
      const total = values.reduce(
        (sum, value) => (typeof value === "number" && !Number.isNaN(value) ? sum + value : sum),
        0
      );
      if (hasInvalid || total < minPaneSize * panels.length) {
        return {};
      }
      return parsed;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    setOrder((prev) => normalizeOrder(panels, prev));
  }, [panels]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}:order`, JSON.stringify(order));
  }, [order, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}:sizes`, JSON.stringify(sizeById));
  }, [sizeById, storageKey]);

  const orderedPanels = useMemo(
    () => order.map((id) => panelMap.get(id)).filter(Boolean),
    [order, panelMap]
  );

  const sizes = orderedPanels.map((panel) => {
    const raw = sizeById[panel.id] ?? panel.initialSize ?? 160;
    if (typeof raw !== "number" || Number.isNaN(raw)) return 160;
    return Math.max(raw, minPaneSize);
  });

  const normalizedTotal = sizes.reduce((sum, value) => sum + value, 0);
  const hasCollapsed = normalizedTotal < minPaneSize * orderedPanels.length;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id);
    const newIndex = order.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setOrder((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleSizeChange = (nextSizes) => {
    setSizeById((prev) => {
      const updated = { ...prev };
      orderedPanels.forEach((panel, index) => {
        const raw = nextSizes[index];
        updated[panel.id] =
          typeof raw === "number" && !Number.isNaN(raw)
            ? Math.max(raw, minPaneSize)
            : minPaneSize;
      });
      return updated;
    });
  };

  if (!orderedPanels.length) return null;

  const panelContent = (
    <SplitPane
      split="horizontal"
      sizes={hasCollapsed ? orderedPanels.map(() => 160) : sizes}
      onChange={handleSizeChange}
      resizerSize={6}
      allowResize
      className="h-full min-h-0"
      style={{ height: "100%" }}
    >
      {orderedPanels.map((panel) => (
        <Pane key={panel.id} minSize={minPaneSize} className="min-h-0">
          <DockPanel id={panel.id} title={panel.title}>
            {panel.content}
          </DockPanel>
        </Pane>
      ))}
    </SplitPane>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedPanels.map((panel) => panel.id)} strategy={verticalListSortingStrategy}>
        {orderedPanels.length === 1 ? (
          <DockPanel id={orderedPanels[0].id} title={orderedPanels[0].title}>
            {orderedPanels[0].content}
          </DockPanel>
        ) : (
          panelContent
        )}
      </SortableContext>
    </DndContext>
  );
}

export default DockStack;
