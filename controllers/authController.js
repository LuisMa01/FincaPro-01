const { pool } = require("../config/db-conect");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const { logEvents } = require("../middleware/logger");

// Peticion POST para el login
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Completar todos los campos" });
  }

  pool
    .query("SELECT * FROM public.table_user WHERE user_name = $1", [username])
    .then(async (results) => {
      const foundUser = results.rows[0];

      if (!foundUser.user_name || !foundUser.user_status) {
        return res.status(401).json({ message: "No autorizado" });
      }

      const match = await bcrypt.compare(password, foundUser.password);

      if (!match) return res.status(401).json({ message: "No autorizado" });

      const accessToken = jwt.sign(
        {
          UserInfo: {
            userId: foundUser.user_id,
            username: foundUser.user_name,
            roles: [foundUser.user_rol],
            nombres: foundUser.user_nombre,
            apellidos: foundUser.user_apellido,
            email: foundUser.email,
            phone: foundUser.user_phone,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { username: foundUser.user_name },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      // Crea coockies con refreshtoken
      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken });
    })
    .catch((err) => {
      setImmediate(async () => {
        await logEvents(
          `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
          "postgresql.log"
        );
        return res.status(400).json({ message: "no fue posible" });
      });
    });
});

// Peticion GET para actualizar el token cuando expira
const refresh = (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.status(401).json({ message: "No autorizado" });

  const refreshToken = cookies.jwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    asyncHandler(async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Prohibido" });

      pool
        .query("SELECT * FROM public.table_user WHERE user_name = $1", [
          decoded.username,
        ])
        .then(async (results) => {
          const foundUser = results.rows[0];

          if (!foundUser.user_name)
            return res.status(401).json({ message: "No autorizado" });

          const accessToken = jwt.sign(
            {
              UserInfo: {
                userId: foundUser.user_id,
                username: foundUser.user_name,
                roles: [foundUser.user_rol],
                nombres: foundUser.user_nombre,
                apellidos: foundUser.user_apellido,
                email: foundUser.email,
                phone: foundUser.user_phone,
              },
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
          );

          res.json({ accessToken });
        })
        .catch((err) => {
          setImmediate(async () => {
            await logEvents(
              `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
              "postgresql.log"
            );
            return res.status(400).json({ message: "no fue posible" });
          });
        });
    })
  );
};

// Peticion POST para realizar el Logout
const logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204);
  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
  res.json({ message: "Cookie cleared" });
};

module.exports = {
  login,
  refresh,
  logout,
};
