const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// Seccion de USUARIOS
//peticion GET
const getAllUsers = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT user_id, user_name, user_nombre, user_apellido, user_status, email, user_phone, user_create_at, user_rol FROM public.table_user ORDER BY user_id"
    )
    .then((results) => {
      const users = results.rows;

      if (!users?.length) {
        return res.status(400).json({ message: "No se encontraron usuarios" });
      }

      res.json(users);
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

// Peticion POST
const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles, names, surname, email, phone } = req.body;

  if (!username || !password || !roles) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  await pool
    .query("SELECT user_name FROM public.table_user WHERE user_name = $1", [
      username,
    ])
    .then(async (results) => {
      const duplicate = results.rows[0];

      if (duplicate) {
        return res
          .status(409)
          .json({ message: "Nombre de usuario ya existente" });
      }

      const hashedPwd = await bcrypt.hash(password, 10);

      const value = [
        username,
        hashedPwd,
        roles,
        names ? names : "",
        surname ? surname : "",
        email ? email : "",
        phone ? phone : "",
      ];

      pool
        .query(
          "INSERT INTO public.table_user (user_name, password, user_rol, user_nombre, user_apellido, email, user_phone) VALUES ($1, $2, $3, $4, $5, $6, $7);",
          value
        )
        .then((results2) => {
          if (results2) {
            setImmediate(async () => {
              await logEvents(`${req.user}\tcreate\t${value}`, "usersLog.log");
            });
            return res.status(201).json({ message: `Nuevo usuario creado` });
          } else {
            return res
              .status(400)
              .json({ message: "Datos de usuario inválido recibidos" });
          }
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

// Peticion PATCH
const updateUser = asyncHandler(async (req, res) => {
  const {
    id,
    username,
    roles,
    status,
    passwordAnt,
    password,
    names,
    surname,
    email,
    phone,
  } = req.body;

  const useradmin = req.user;

  if (!id || !username || !roles || typeof status !== "boolean") {
    return res
      .status(400)
      .json({ message: "Todos los campos excepto contraseña son requeridos" });
  }

  pool
    .query(
      "SELECT user_id, user_name, password, user_nombre, user_apellido, user_status, email, user_phone, user_create_at, user_rol FROM public.table_user WHERE user_id = $1",
      [id]
    )
    .then((result) => {
      const user = result.rows[0].user_name;
      if (!user?.length) {
        return res.status(400).json({ message: "No se encontraron" });
      }

      pool
        .query("SELECT user_name FROM public.table_user WHERE user_name = $1", [
          username,
        ])
        .then(async (resultName) => {
          const duplicate = resultName.rows[0];
          let hashP;
          let matchSuper = false;
          if (password) {
            const match = await bcrypt.compare(
              passwordAnt,
              result.rows[0].password
            );

            await pool
              .query(
                "SELECT user_id, user_name, password, user_nombre, user_apellido, user_status, email, user_phone, user_create_at, user_rol FROM public.table_user WHERE user_name = $1",
                [useradmin]
              )
              .then(async (resultSuperUser) => {
                if (resultSuperUser.rows[0].user_id == 1) {
                  matchSuper = await bcrypt.compare(
                    passwordAnt,
                    resultSuperUser.rows[0].password
                  );
                }
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

            if (match || matchSuper) {
              hashP = await bcrypt.hash(password, 10);
            }
          }

          const valueInto = [
            duplicate ? result.rows[0].user_name : username,
            password ? hashP : result.rows[0].password,
            roles ? roles : result.rows[0].user_rol,
            names ? names : result.rows[0].user_nombre,
            surname ? surname : result.rows[0].user_apellido,
            status,
            email ? email : result.rows[0].email,
            phone ? phone : result.rows[0].user_phone,
          ];

          pool
            .query(
              `UPDATE public.table_user	SET user_name=$1, password=$2, user_rol=$3, user_nombre=$4, user_apellido=$5, user_status=$6, email=$7, user_phone=$8	WHERE user_id= ${id}`,
              valueInto
            )
            .then((valueUpdate) => {
              if (valueUpdate) {
                setImmediate(async () => {
                  await logEvents(
                    `${req.user}\tUpdate\t${user}\t${valueInto}`,
                    "usersLog.log"
                  );
                });
                return res.json({
                  message: `usuario Actualizado.${
                    duplicate ? " Nombre de usuario duplicado" : ""
                  }`,
                });
              }
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

// Peticion DELETE
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "ID de usuario requerido" });
  }
  if (id == req.id) {
    return res
      .status(400)
      .json({ message: "Usuario debe ser eliminado por el administrador" });
  }
  if (id == 1 || id == 2 || id == 3) {
    return res.status(400).json({ message: "Usuario no puede ser eliminado." });
  }

  pool
    .query(
      `SELECT user_id, user_name FROM public.table_user WHERE user_id = ${id}`
    )
    .then((exist) => {
      if (!exist.rows[0].user_id) {
        return res.status(400).json({ message: "Usuario no encontrado" });
      }
      pool
        .query(`DELETE FROM public.table_user WHERE user_id = ${id}`)
        .then(() => {
          setImmediate(async () => {
            await logEvents(
              `${req.user}\tDelete\t${exist.rows[0].user_name}`,
              "usersLog.log"
            );
          });

          return res.json({ message: "Usuario eliminado" });
        })
        .catch((err) => {
          setImmediate(async () => {
            await logEvents(
              `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
              "postgresql.log"
            );
            return res
              .status(400)
              .json({ message: "Usuario no puede ser eliminado" });
          });
        });
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

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
