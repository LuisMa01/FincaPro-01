const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");


// @desc Get all act
// @route GET /act
// @access Private
const getAllPlants = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT plant_id, plant_name, plant_desc, plant_status, plant_create_at, plant_variety, plant_create_by FROM public.table_plant ORDER BY plant_id ASC"
    )
    .then((results) => {
      //res.send(results.rows)
      const plant = results.rows;
      // If no users
      if (!plant?.length) {
        return res.status(400).json({ message: "No se encontraron planta" });
      }

      res.json(plant);
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
const createNewPlant = asyncHandler(async (req, res) => {
  const { username, plantName, desc, variety } = req.body;

  //act_id, act_name, act_desc, create_act, act_create_by, act_status

  if (!username || !plantName) {
    return res.status(400).json({ message: "Ingresar nombre de la planta" });
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
          "SELECT plant_name FROM public.table_plant WHERE plant_name = $1",
          [plantName]
        )
        .then((results) => {
          const duplPlant = results.rows[0];
          if (duplPlant) {
            return res.status(409).json({ message: "Planta Duplicada" });
          }

          const dateN = new Date();
          
          const value = [
            plantName,
            desc ? desc : "",
            dateN,
            variety ? variety : "",
            userAdmin.user_id,
          ];
          pool
            .query(
              "INSERT INTO public.table_plant( plant_name, plant_desc, plant_create_at, plant_variety, plant_create_by) VALUES ($1, $2, $3, $4, $5);",
              value
            )
            .then((results2) => {
              
              if (results2) {
                //created
                return res.status(201).json({ message: `Nuevo planta creada` });
              } else {
                return res.status(400).json({
                  message: "Datos de la planta inválido recibido",
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

// @desc Update a act
// @route PATCH /act
// @access Private
const updatePlant = asyncHandler(async (req, res) => {
  const { id, plantName, desc, variety, active } = req.body;

  // Confirm data
  if (!id || !plantName || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los Campos son requeridos." });
  }

  pool
    .query(
      "SELECT plant_id, plant_name, plant_desc, plant_variety, plant_status FROM public.table_plant  WHERE plant_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const plant = result.rows[0].plant_name;
      if (!plant?.length) {
        return res.status(400).json({ message: "No se encontró la planta" });
      }

      pool
        .query(
          "SELECT plant_name FROM public.table_plant  WHERE plant_name = $1",
          [plantName]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].plant_name : plantName,
            desc ? desc : result.rows[0].plant_desc,
            active,
            variety ? variety : result.rows[0].plant_variety,
          ];

          pool
            .query(
              `UPDATE public.table_plant SET plant_name=$1, plant_desc=$2, plant_status=$3, plant_variety=$4	WHERE act_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              // usuario actualizado

              if (valueUpdate) {
                return res.json({
                  message: `Planta actualizada. ${
                    duplicate ? " Planta duplicada" : ""
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

// @desc Delete a act
// @route DELETE /act
// @access Private
const deletePlant = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID de la planta requerida" });
  }

  pool
    .query(`SELECT plant_id FROM public.table_plant WHERE plant_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Planta no encontrada" });
      }
      pool
        .query(`DELETE FROM public.table_plant WHERE plant_id = ${id}`)
        .then(() => {
          return res.json({ message: "Planta eliminada" });
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
  getAllPlants,
  createNewPlant,
  updatePlant,
  deletePlant,
};
