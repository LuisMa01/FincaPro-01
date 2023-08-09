const jwt = require("jsonwebtoken");

//Verifica el TOKEN asignado a un usuario y determona si tiene acceso a los recursos.

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No Autorizado" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Prohibido" });
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;
    req.id = decoded.UserInfo.userId;
    next();
  });
};

module.exports = verifyJWT;
