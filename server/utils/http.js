const logger = require("./logger");

function isProd() {
  return process.env.NODE_ENV === "production";
}

function sendError(res, statusCode, publicMessage, error) {
  logger.error(publicMessage, error);
  const payload = { error: publicMessage };
  if (!isProd() && error) {
    payload.details = String(error?.message || error);
  }
  res.status(statusCode).json(payload);
}

module.exports = {
  sendError,
};

