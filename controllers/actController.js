const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all act
// @route GET /act
// @access Private
const getAllActs = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT act_id, act_name, act_desc, act_create_at, act_create_by, act_status FROM public.table_activity ORDER BY act_id ASC"
    )
    .then((results) => {
      //res.send(results.rows)
      const act = results.rows;
      // If no users
      if (!act?.length) {
        return res
          .status(400)
          .json({ message: "No se encontraron actividades" });
      }

      res.json(act);
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

// @desc Create new act
// @route POST /act
// @access Private
const createNewAct = asyncHandler(async (req, res) => {
  const { username, activity, desc } = req.body;

  //act_id, act_name, act_desc, create_act, act_create_by, act_status

  if (!username || !activity) {
    return res.status(400).json({ message: "Ingresar nombre de la actividad" });
  }

  // Check for duplicate username`
  await pool
    .query(
      "SELECT user_id, user_status, user_rol  FROM public.table_user WHERE user_name = $1",
      [username]
    )
    .then(async (results) => {
      const userAdmin = results.rows[0];
      if (!userAdmin) {
        return res.status(403).json({ message: "Usuario no existe" });
      }

      if (!userAdmin.user_status) {
        return res.status(403).json({ message: "Usuario inactivo" });
      }
      if (userAdmin.user_rol !== 1) {
        return res
          .status(403)
          .json({ message: "El usuario no está autorizado" });
      }

      pool
        .query(
          "SELECT act_name FROM public.table_activity WHERE act_name = $1",
          [activity]
        )
        .then((results) => {
          const duplAct = results.rows[0];
          if (duplAct) {
            return res.status(409).json({ message: "Actividad Duplicada" });
          }

          const dateN = new Date();
          const value = [activity, desc ? desc : "", dateN, userAdmin.user_id];
          pool
            .query(
              "INSERT INTO public.table_activity( act_name, act_desc, act_create_at, act_create_by) VALUES ($1, $2, $3, $4);",
              value
            )
            .then((results2) => {
              console.log("aqui");
              if (results2) {
                //created
                return res
                  .status(201)
                  .json({ message: `Nuevo actividad creada` });
              } else {
                return res
                  .status(400)
                  .json({
                    message: "Datos de la actividad inválido recibidos",
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

// @desc Update a user
// @route PATCH /users
// @access Private
const updateAct = asyncHandler(async (req, res) => {
  const { id, username, roles, active, password, names, surname, email, cell } =
    req.body;

  // Confirm data
  if (!id || !username || !roles || typeof active !== "boolean") {
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
      'SELECT user_id, user_name, password, rol_user, nombres, apellidos, activo, email, cell FROM "userSchema"."User" WHERE user_id = $1',
      [id]
    )
    .then((result) => {
      // If no users
      const user = result.rows[0].user_name;
      if (!user?.length) {
        return res.status(400).json({ message: "No se encontraron" });
      }

      pool
        .query(
          'SELECT user_name FROM "userSchema"."User" WHERE user_name = $1',
          [username]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          if (password) {
            // Hash password
            hashP = await bcrypt.hash(password, 10); // salt rounds
          }

          const valueInto = [
            duplicate ? result.rows[0].user_name : username,
            password ? hashP : result.rows[0].password,
            roles ? roles : result.rows[0].rol_user,
            names ? names : result.rows[0].nombres,
            surname ? surname : result.rows[0].apellidos,
            active,
            email ? email : result.rows[0].email,
            cell ? cell : result.rows[0].cell,
          ];

          pool
            .query(
              `UPDATE "userSchema"."User"	SET user_name=$1, password=$2, rol_user=$3, nombres=$4, apellidos=$5, activo=$6, email=$7, cell=$8	WHERE user_id= ${id}`,
              valueInto
            )
            .then((valueUpdate) => {
              // usuario actualizado

              if (valueUpdate) {
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
const deleteAct = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID de la actividad requerida" });
  }

  // Does the user still have assi gned notes?
  pool
    .query(`SELECT act_id FROM public.table_activity WHERE act_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Actividad no encontrada" });
      }
      pool
        .query(`DELETE FROM public.table_activity WHERE act_id = ${id}`)
        .then(() => {
          return res.json({ message: "Actividad eliminada" });
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

module.exports = {
  getAllActs,
  createNewAct,
  updateAct,
  deleteAct,
};
