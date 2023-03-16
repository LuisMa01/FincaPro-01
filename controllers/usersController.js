const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req, res) => {
  // Get all users from MongoDB
  console.log(` importante ${req.user} ${req.roles}`);
  pool
    .query(
      "SELECT user_id, user_name, user_nombre, user_apellido, user_status, email, user_phone, user_create_at, user_create_by, user_rol FROM public.table_user ORDER BY user_id"
    )
    .then((results) => {
      //res.send(results.rows)
      const users = results.rows;
      // If no users
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
        //throw err;
      });
    });
});

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles, names, surname, email, phone } = req.body;

  // Confirm data
  /*
  if (!username || !password || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: "All fields are required" });
  }
  */
  console.log("creando nuevo usuario");
  if (!username || !password || !roles) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  // Check for duplicate username`
  await pool
    .query("SELECT user_name FROM public.table_user WHERE user_name = $1", [
      username,
    ])
    .then(async (results) => {
      const duplicate = results.rows[0];
      // If no users
      if (duplicate) {
        return res
          .status(409)
          .json({ message: "Nombre de usuario ya existente" });
      }
      // Hash password
      const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

      const value = [
        username,
        hashedPwd,
        roles,
        names ? names : "",
        surname ? surname : "",
        email ? email : "",
        phone ? phone : "",
      ];

      // Create and store new user

      pool
        .query(
          "INSERT INTO public.table_user (user_name, password, user_rol, user_nombre, user_apellido, email, user_phone) VALUES ($1, $2, $3, $4, $5, $6, $7);",
          value
        )
        .then((results2) => {
          if (results2) {
            //created
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
            throw err;
          });
        });
    })
    .catch((err) => {
      setImmediate(async () => {
        await logEvents(
          `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
          "postgresql.log"
        );
        throw err;
      });
    });
});

// @desc Update a user
// @route PATCH /users
// @access Private
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
console.log(password);
console.log(passwordAnt);

  // Confirm data
  if (!id || !username || !roles || typeof status !== "boolean") {
    return res
      .status(400)
      .json({ message: "Todos los campos excepto contraseña son requeridos" });
  }

  //if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
  //    return res.status(400).json({ message: 'All fields except password are required' })
  //}

  // Does the user exist to update?

  pool
    .query(
      "SELECT user_id, user_name, password, user_nombre, user_apellido, user_status, email, user_phone, user_create_at, user_create_by, user_rol FROM public.table_user WHERE user_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const user = result.rows[0].user_name;
      if (!user?.length) {
        return res.status(400).json({ message: "No se encontraron" });
      }

      pool
        .query("SELECT user_name FROM public.table_user WHERE user_name = $1", [
          username,
        ])
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];
          let hashP;

          if (password) {
            console.log("user.password");
            const match = await bcrypt.compare(passwordAnt, result.rows[0].password);
            console.log("bbbbbbbbbbbbb");

            if (match) {
              // Hash password
              console.log("ffffff");
              hashP = await bcrypt.hash(password, 10); // salt rounds
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
              // usuario actualizado

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
                throw err;
              });
            });
        })
        .catch((err) => {
          setImmediate(async () => {
            await logEvents(
              `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
              "postgresql.log"
            );
            throw err;
          });
        });
    })
    .catch((err) => {
      setImmediate(async () => {
        await logEvents(
          `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
          "postgresql.log"
        );
        throw err;
      });
    });
});

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  console.log(`delete ${req.id}`);

  // Confirm data
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

  // Does the user still have assi gned notes?
  pool
    .query(
      `SELECT user_id, user_name FROM public.table_user WHERE user_id = ${id}`
    )
    .then((exist) => {
      // usuario
      if (!exist.rows[0].user_id) {
        return res.status(400).json({ message: "Usuario no encontrado" });
      }
      pool
        .query(`DELETE FROM public.table_user WHERE user_id = ${id}`)
        .then(() => {
          // usuario borrado
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
            //throw err;
          });
        });
    })
    .catch((err) => {
      setImmediate(async () => {
        await logEvents(
          `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
          "postgresql.log"
        );
        throw err;
      });
    });
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
