const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");


// @desc Get all
// @route GET /dose
// @access Private
const getAllDoses = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT dose_id, dose_name, dose_status, dose_create_at, dose_unit, dose_desc FROM public.table_dose ORDER BY dose_id ASC;"
    )
    .then((results) => {
      //res.send(results.rows)
      const dose = results.rows;
      // If no users
      if (!dose?.length) {
        return res.status(400).json({ message: "No se encontraron campos" });
      }

      res.json(dose);
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

// @desc Create new
// @route POST /dose
// @access Private
const createNewDose = asyncHandler(async (req, res) => {
  const { doseName, desc, doseUnit } = req.body;

  //act_id, act_name, act_desc, create_act, act_status
  const username = req.user
  if (!username || !doseName) {
    return res.status(400).json({ message: "Ingresar nombre de los campos requeridos." });
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
          "SELECT dose_name FROM public.table_dose WHERE dose_name = $1",
          [doseName]
        )
        .then((results) => {
          const duplDose = results.rows[0];
          if (duplDose) {
            return res.status(409).json({ message: "Dosis duplicada" });
          }

          const dateN = new Date();
          
          const value = [
            doseName,
            desc ? desc : "",
            dateN,
            doseUnit ? doseUnit : "",
          ];
          pool
            .query(
              "INSERT INTO public.table_dose( dose_name, dose_desc, dose_create_at, dose_unit) VALUES ($1, $2, $3, $4);",
              value
            )
            .then((results2) => {
              
              if (results2) {
                //created
                return res.status(201).json({ message: `Nuevo dosis creado.` });
              } else {
                return res.status(400).json({
                  message: "Datos de la dosis inválido recibido",
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
       // throw err;
      });
    });
});

// @desc Update
// @route PATCH /dose
// @access Private
const updateDose = asyncHandler(async (req, res) => {
  const { id, doseName, desc, active, doseUnit } = req.body;

  // Confirm data
  if (!id || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT dose_id, dose_name, dose_desc, dose_status, dose_unit FROM public.table_dose  WHERE dose_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const dose = result.rows[0].dose_name;
      if (!dose?.length) {
        return res.status(400).json({ message: "No se encontró la dosis." });
      }

      pool
        .query(
          "SELECT dose_name FROM public.table_dose  WHERE dose_name = $1",
          [doseName]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].dose_name : doseName,
            desc ? desc : result.rows[0].dose_desc,
            doseUnit ? doseUnit : result.rows[0].dose_unit,
            active,
          ];

          pool
            .query(
              `UPDATE public.table_dose SET dose_name=$1, dose_desc=$2, dose_unit=$3, dose_status=$4	WHERE dose_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              

              if (valueUpdate) {
                return res.json({
                  message: `Dosis actualizada. ${
                    duplicate ? " Dosis duplicada" : ""
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

// @desc Delete
// @route DELETE /dose
// @access Private
const deleteDose = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID de la dosis requerida" });
  }

  pool
    .query(`SELECT dose_id FROM public.table_dose WHERE dose_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Dosis no encontrado" });
      }
      pool
        .query(`DELETE FROM public.table_dose WHERE dose_id = ${id}`)
        .then(() => {
          return res.json({ message: "Dosis eliminado." });
        })
        .catch((err) => {
          setImmediate(async () => {
            await logEvents(
              `${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,
              "postgresql.log"
            );
            return res.status(400).json({ message: "no fue posible" })
            // throw err;
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
  getAllDoses,
  createNewDose,
  updateDose,
  deleteDose,
};
