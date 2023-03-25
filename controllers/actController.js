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
      "SELECT act_id, act_name, act_desc, act_create_at, act_status FROM public.table_activity ORDER BY act_id ASC"
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
        return res.status(400).json({ message: "no fue posible" })
        //throw err;
      });
    });
});

// @desc Create new act
// @route POST /act
// @access Private
const createNewAct = asyncHandler(async (req, res) => {
  const { actName, desc } = req.body;

  //act_id, act_name, act_desc, create_act, act_status
 const username = req.user
  if (!username || !actName) {
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
          [actName]
        )
        .then((results) => {
          const duplAct = results.rows[0];
          if (duplAct) {
            return res.status(409).json({ message: "Actividad Duplicada" });
          }

          const dateN = new Date();
          const value = [actName, desc ? desc : "", dateN];
          pool
            .query(
              "INSERT INTO public.table_activity( act_name, act_desc, act_create_at) VALUES ($1, $2, $3);",
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
                return res.status(400).json({ message: "no fue posible" })
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
            return res.status(400).json({ message: "no fue posible" })
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
        return res.status(400).json({ message: "no fue posible" })
        //throw err;
      });
    });
});

// @desc Update a act
// @route PATCH /act
// @access Private
const updateAct = asyncHandler(async (req, res) => {
  const { id, actName, desc, active } =
    req.body;

  
  // Confirm data
  if (!id || !actName || typeof active !== "boolean") {
    return res
      .status(400)
      .json({ message: "Los Campos id y actName son requeridos." });
  }

  pool
    .query(
      'SELECT act_id, act_name, act_desc, act_status FROM public.table_activity  WHERE act_id = $1',
      [id]
    )
    .then((result) => {
      // If no users
      const act = result.rows[0].act_name;
      if (!act?.length) {
        return res.status(400).json({ message: "No se encontró la actividad" });
      }

      pool
        .query(
          'SELECT act_name FROM public.table_activity  WHERE act_name = $1',
          [actName]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].act_name : actName,
            desc  ? desc : result.rows[0].act_desc,
            active,
          ];

          pool
            .query(
              `UPDATE public.table_activity SET act_name=$1, act_desc=$2, act_status=$3	WHERE act_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              // usuario actualizado

              if (valueUpdate) {
                return res.json({
                  message: `Actividad actualizada.${
                    duplicate ? " Actividad duplicada" : ""
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
                return res.status(400).json({ message: "no fue posible" })
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
            return res.status(400).json({ message: "no fue posible" })
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
        return res.status(400).json({ message: "no fue posible" })
        //throw err;
      });
    });
});

// @desc Delete a act
// @route DELETE /act
// @access Private
const deleteAct = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID de la actividad requerida" });
  }

  
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
            return res.status(400).json({ message: "no fue posible" })
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
        return res.status(400).json({ message: "no fue posible" })
        //throw err;
      });
    });
});

module.exports = {
  getAllActs,
  createNewAct,
  updateAct,
  deleteAct,
};
