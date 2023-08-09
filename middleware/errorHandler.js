const { logEvents } = require("./logger");

//manejador de errores. crea un archivo en la carpeta logs para conservar un registro de los errores.
const errorHandler = async (err, req, res, next) => {
  await logEvents(
    `${err.name}: ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
    "errLog.log"
  );
  console.log(err.stack);

  const status = res.statusCode ? res.statusCode : 500;

  res.status(status);

  res.json({ message: err.message, isError: true });
};

module.exports = errorHandler;
