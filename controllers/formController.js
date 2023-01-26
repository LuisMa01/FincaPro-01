const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");

// @desc Get all
// @route GET /dose
// @access Private
const getAllForms = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT acts_id, act_key, plant_key, acts_user_key, acts_create_at FROM public.table_acts_plant;"
    )
    .then((results) => {
      //res.send(results.rows)
      const form = results.rows;
      // If no users
      if (!form?.length) {
        return res
          .status(400)
          .json({ message: "No se encontraron actividdades en el formulario" });
      }

      res.json(form);
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

// @desc Create new
// @route POST /dose
// @access Private
const createNewForm = asyncHandler(async (req, res) => {
  const { username, idAct, idPlant } = req.body;

  //act_id, act_name, act_desc, create_act, act_create_by, act_status

  if (!username || !idAct || !idPlant) {
    return res
      .status(400)
      .json({ message: "Completar los campos requeridos." });
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
          "SELECT act_key, plant_key FROM public.table_acts_plant WHERE act_key = $1 AND plant_key = $2;",
          [idAct, idPlant]
        )
        .then((results) => {
          const duplAct = results.rows[0].act_key;
          const duplPlant = results.rows[0].plant_key;
          if (duplAct && duplPlant) {
            return res.status(409).json({ message: "Acción duplicada" });
          }

          const dateN = new Date();

          const value = [idAct, idPlant, userAdmin.user_id, dateN];
          pool
            .query(
              "INSERT INTO public.table_acts_plant( act_key, plant_key, acts_user_key, acts_create_at) VALUES ($1, $2, $3, $4);",
              value
            )
            .then((results2) => {
              if (results2) {
                //created
                return res
                  .status(201)
                  .json({ message: `Nueva actividad agregada.` });
              } else {
                return res.status(400).json({
                  message: "Datos de la actividad inválidos recibido",
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

// @desc Update
// @route PATCH /dose
// @access Private
const updateForm = asyncHandler(async (req, res) => {
  const { id, idAct, idPlant } = req.body;

  // Confirm data
  if (!id || !idAct || !idPlant) {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT acts_id, act_key, plant_key FROM public.table_acts_plant WHERE acts_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const acts = result.rows[0].acts_id;
      if (!acts?.length) {
        return res
          .status(400)
          .json({ message: "No se encontró la actividad." });
      }

      pool
        .query(
          "SELECT act_key, plant_key FROM public.table_acts_plant WHERE act_key = $1 AND plant_key = $2;",
          [idAct, idPlant]
        )
        .then(async (resultName) => {
          const duplAct = resultName.rows[0].act_key;
          const duplPlant = resultName.rows[0].plant_key;
          if (duplAct && duplPlant) {
            return res.status(409).json({ message: "Acción duplicada" });
          }

          const valueInto = [idAct, idPlant];

          pool
            .query(
              `UPDATE public.table_acts_plant SET plant_key=$1, plant_key=$2 WHERE acts_id=${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              if (valueUpdate) {
                return res.json({
                  message: `Actividad actualizada.`,
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

// @desc Delete
// @route DELETE /dose
// @access Private
const deleteForm = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID requerida" });
  }

  pool
    .query(`SELECT acts_id FROM public.table_acts_plant WHERE acts_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Actividad no encontrada" });
      }
      pool
        .query(`DELETE FROM public.table_acts_plant WHERE acts_id = ${id}`)
        .then(() => {
          return res.json({ message: "Actividad eliminada." });
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
  getAllForms,
  createNewForm,
  updateForm,
  deleteForm,
};
