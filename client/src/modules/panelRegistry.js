const panelRegistry = new Map();

export const registerPanel = (id, panelDef) => {
  if (!id) throw new Error("Panel id is required");
  panelRegistry.set(id, { id, ...panelDef });
  return panelRegistry.get(id);
};

export const getPanel = (id) => panelRegistry.get(id);

export const listPanels = () => Array.from(panelRegistry.values());

export const listPanelsByDock = (dockId) =>
  listPanels()
    .filter((panel) => panel.dock === dockId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const clearPanelRegistry = () => panelRegistry.clear();
