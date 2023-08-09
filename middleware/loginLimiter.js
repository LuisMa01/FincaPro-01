const rateLimit = require("express-rate-limit");
const { logEvents } = require("./logger");

// limita a 5 las veces que un usuario puede intentar hacer login.

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    message:
      "Alcanzo el limite de intento para esta IP, Intente de nuevo despues de un minuto",
  },
  handler: (req, res, next, options) => {
    logEvents(
      `Demasiados intentos: ${options.message.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
      "errLog.log"
    );
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginLimiter;
