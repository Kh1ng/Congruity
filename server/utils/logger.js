/* eslint-disable no-console */
const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const levelName = (process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"))
  .toLowerCase();
const minLevel = LEVELS[levelName] || LEVELS.info;

function shouldLog(level) {
  return LEVELS[level] >= minLevel;
}

function serializeMeta(meta) {
  if (!meta) return undefined;
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }
  return meta;
}

function log(level, message, meta) {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  const serialized = serializeMeta(meta);
  if (serialized !== undefined) {
    payload.meta = serialized;
  }
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](JSON.stringify(payload));
}

module.exports = {
  debug: (message, meta) => log("debug", message, meta),
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};

