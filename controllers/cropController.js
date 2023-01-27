const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");


// @desc Get all
// @route GET /crop
// @access Private
const getAllCrops = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT crop_id, crop_name, crop_plant, crop_harvest, crop_status, crop_final_prod, crop_user_key, crop_camp_key FROM public.table_crop ORDER BY crop_id ASC;"
    )
    .then((results) => {
      //res.send(results.rows)
      const crop = results.rows;
      // If no users
      if (!crop?.length) {
        return res.status(400).json({ message: "No se encontraron campos" });
      }

      res.json(crop);
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
// @route POST /crop
// @access Private
const createNewCrop = asyncHandler(async (req, res) => {
  const { username, cropName, datePlant, dateHarvest, cropStatus, finalProd, cropUserKey, cropCampKey } = req.body;

  

  if (!username || !cropCampKey) {
    return res.status(400).json({ message: "Llenar los campos requeridos." });
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
          "SELECT crop_name FROM public.table_crop WHERE crop_name = $1",
          [cropName]
        )
        .then((results) => {
          const duplDose = results.rows[0];
          if (duplDose) {
            return res.status(409).json({ message: "Dosis duplicada" });
          }

          const dateN = new Date();
          
          const value = [
            cropName,
            desc ? desc : "",
            dateN,
            doseUnit ? doseUnit : "",
            userAdmin.user_id,
          ];
          pool
            .query(
              "INSERT INTO public.table_dose( dose_name, dose_desc, dose_create_at, dose_unit, dose_create_by) VALUES ($1, $2, $3, $4, $5);",
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
// @route PATCH /crop
// @access Private
const updateCrop = asyncHandler(async (req, res) => {
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
      const crop = result.rows[0].dose_name;
      if (!crop?.length) {
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
            duplicate ? result.rows[0].dose_name : campName,
            desc ? desc : result.rows[0].dose_desc,
            doseUnit ? doseUnit : result.rows[0].dose_unit,
            active,
          ];

          pool
            .query(
              `UPDATE public.table_dose SET dose_name=$1, dose_desc=$2, dose_unit=$3, dose_status=$4	WHERE camp_id= ${id};`,
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
// @route DELETE /crop
// @access Private
const deleteCrop = asyncHandler(async (req, res) => {
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
  getAllCrops,
  createNewCrop,
  updateCrop,
  deleteCrop,
};
