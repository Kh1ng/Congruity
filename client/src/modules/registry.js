const registry = new Map();

export const registerModule = (id, moduleDef) => {
  if (!id) {
    throw new Error("Module id is required");
  }
  registry.set(id, { id, ...moduleDef });
  return registry.get(id);
};

export const getModule = (id) => registry.get(id);

export const listModules = () => Array.from(registry.values());

export const clearRegistry = () => registry.clear();
