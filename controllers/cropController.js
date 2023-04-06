const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");


// @desc Get all
// @route GET /crop
// @access Private
const getAllCrops = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT crop_id, crop_name, crop_plant, crop_harvest, crop_status, crop_final_prod, crop_user_key, crop_camp_key, plant_name, plant_frame, plant_variety, user_name, camp_name, crop_plant_key, crop_area FROM public.table_crop INNER JOIN public.table_plant ON plant_id = crop_plant_key INNER JOIN public.table_user ON user_id = crop_user_key INNER JOIN public.table_camp ON camp_id = crop_camp_key ORDER BY crop_id ASC;"
    )
    .then((results) => {
      //res.send(results.rows)
      const crop = results.rows;
      // If no users
      if (!crop?.length) {
        return res.status(400).json({ message: "No se encontraron cultivos" });
      }

      res.json(crop);
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
// @route POST /crop
// @access Private
const createNewCrop = asyncHandler(async (req, res) => {
  const { repUser, cropName, datePlant, dateHarvest, finalProd, cropCampKey, cropPlantKey, cropArea } = req.body;

  
  const username = req.user
  if (!username || !cropName || !cropPlantKey) {
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
          const duplCrop = results.rows[0];
          if (duplCrop) {
            return res.status(409).json({ message: "Crops duplicada" });
          }

          //const dateN = new Date();
          
          const value = [
            cropName,
            datePlant ? datePlant : null,
            dateHarvest ? dateHarvest : null,
            finalProd ? finalProd : "",
            cropCampKey ? cropCampKey : null,
            cropPlantKey,
            repUser ? repUser : null,
            cropArea ? cropArea : null,
          ];
          pool
            .query(
              "INSERT INTO public.table_crop( crop_name, crop_plant, crop_harvest, crop_final_prod, crop_camp_key, crop_plant_key, crop_user_key, crop_area) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);",
              value
            )
            .then((results2) => {
              
              if (results2) {
                //created
                return res.status(201).json({ message: `Nuevo cultivo creado.` });
              } else {
                return res.status(400).json({
                  message: "Datos del cultivo inválido recibido",
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

// @desc Update
// @route PATCH /crop
// @access Private
const updateCrop = asyncHandler(async (req, res) => {
  const { id, repUser, cropName, datePlant, dateHarvest, finalProd, cropCampKey, cropPlantKey, active, cropArea } = req.body;

  // Confirm data
  if (!id || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT crop_id, crop_name, crop_plant, crop_harvest, crop_status, crop_final_prod, crop_user_key, crop_plant_key, crop_camp_key, crop_area FROM public.table_crop  WHERE crop_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const crop = result.rows[0].crop_name;
      if (!crop?.length) {
        return res.status(400).json({ message: "No se encontró el cultivo." });
      }

      pool
        .query(
          "SELECT crop_name FROM public.table_crop  WHERE crop_name = $1",
          [cropName]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].crop_name : cropName,
            datePlant ? datePlant : result.rows[0].crop_plant,
            dateHarvest ? dateHarvest : result.rows[0].crop_harvest,
            finalProd ? finalProd : result.rows[0].crop_final_prod,
            cropCampKey ? cropCampKey : result.rows[0].crop_camp_key,
            cropPlantKey ? cropPlantKey : result.rows[0].crop_Plant_key,
            active,
            repUser ? repUser : result.rows[0].crop_user_key,
            cropArea ? cropArea : result.rows[0].crop_area,
          ];

          pool
            .query(
              `UPDATE public.table_crop SET crop_name=$1, crop_plant=$2, crop_harvest=$3, crop_final_prod=$4, crop_camp_key=$5, crop_plant_key=$6, crop_status=$7, crop_user_key=$8, crop_area=$9	WHERE crop_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              

              if (valueUpdate) {
                return res.json({
                  message: `Cultivo actualizado. ${
                    duplicate ? " Cultivo duplicada" : ""
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
// @route DELETE /crop
// @access Private
const deleteCrop = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID del cultivo requerido" });
  }

  pool
    .query(`SELECT crop_id FROM public.table_crop WHERE crop_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Cultivo no encontrado" });
      }
      pool
        .query(`DELETE FROM public.table_crop WHERE crop_id = ${id}`)
        .then(() => {
          return res.json({ message: "Cultivo eliminado." });
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
  getAllCrops,
  createNewCrop,
  updateCrop,
  deleteCrop,
};
