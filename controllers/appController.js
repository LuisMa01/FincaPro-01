const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");


// @desc Get all
// @route GET /app
// @access Private
const getAllApps = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT date_init, date_end, date_act_key, date_crop_key, date_id, crop_camp_key, crop_plant_key	FROM public.table_app_date INNER JOIN public.table_crop ON crop_id = date_crop_key ORDER BY date_id ASC;"
    )
    .then((results) => {
      //res.send(results.rows)
      const appDate = results.rows;
      // If no users
      if (!appDate?.length) {
        return res.status(400).json({ message: "No se encontraron campos" });
      }

      res.json(appDate);
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
// @route POST /app
// @access Private
/*
SELECT date_init, date_end, date_act_key, date_crop_key, date_id, crop_camp_key, crop_plant_key
	FROM public.table_app_date
	INNER JOIN public.table_crop ON crop_id = date_crop_key;
*/
const createNewApp = asyncHandler(async (req, res) => {
  const { username, dateInit, dateEnd, actKey, cropKey, plantId  } = req.body;

  

  if (!actKey || !cropKey || !plantId) {
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
          "SELECT date_init, date_end, date_act_key, date_crop_key, date_id, crop_camp_key, crop_plant_key FROM public.table_app_date INNER JOIN public.table_crop ON crop_id = date_crop_key WHERE date_crop_key = $1;",
          [cropKey]
        )
        .then((results) => {
          const crop = results.rows[0];
          if (crop) {
            if (crop.crop_plant_key !== plantId) {
              return res.status(409).json({ message: "Actividad corresponde a otro cultivo." });
            }            
          }

          //const dateN = new Date();
          
          const value = [
            dateInit ? dateInit : null,
            dateEnd ? dateEnd : null,
            actKey,
            cropKey,
          ];
          pool
            .query(
              "INSERT INTO public.table_app_date(date_init, date_end, date_act_key, date_crop_key) VALUES ($1, $2, $3, $4);",
              value
            )
            .then((results2) => {
              
              if (results2) {
                //created
                return res.status(201).json({ message: `Nuevo actividad agregada.` });
              } else {
                return res.status(400).json({
                  message: "Datos de la actividad inválido recibido",
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
const updateApp = asyncHandler(async (req, res) => {
  const { id, dateInit, dateEnd, actKey, cropKey, plantId } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT date_init, date_end, date_act_key, date_crop_key, date_id, crop_camp_key, crop_plant_key FROM public.table_app_date INNER JOIN public.table_crop ON crop_id = date_crop_key WHERE date_id = $1;",
      [id]
    )
    .then((result) => {
      // If no users
      const app = result.rows[0];
      if (!app?.length) {
        return res.status(400).json({ message: "No se encontró la actividad en el cultivo." });
      }
      if (app) {
        if (app.plant_key !== plantId) {
          return res.status(409).json({ message: "Actividad corresponde a otro cultivo." });
        }            
      }


          const valueInto = [
            dateInit ? dateInit : result.rows[0].date_init,
            dateEnd ? dateEnd : result.rows[0].date_end,
            actKey ? actKey : result.rows[0].date_act_key,
            cropKey ? cropKey : result.rows[0].date_crop_key,
          ];

          pool
            .query(
              `UPDATE public.table_app_date SET date_init=$1, date_end=$2, date_act_key=$3, date_crop_key=$4	WHERE date_id=${id};`,
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
});

// @desc Delete
// @route DELETE /crop
// @access Private
const deleteApp = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID requerido" });
  }

  pool
    .query(`SELECT date_id FROM public.table_app_date WHERE date_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Actividad no encontrada en el cultivo" });
      }
      pool
        .query(`DELETE FROM public.table_app_date WHERE date_id = ${id}`)
        .then(() => {
          return res.json({ message: "Actividad eliminado del cultivo." });
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

module.exports ={
  getAllApps,
  createNewApp,
  updateApp,
  deleteApp,
};
