const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");

// Seccion de PLANTAS
//peticion GET
const getAllPlants = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT plant_id, plant_name, plant_desc, plant_status, plant_create_at, plant_variety, plant_frame FROM public.table_plant ORDER BY plant_id ASC"
    )
    .then((results) => {
      const plant = results.rows;

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
      });
    });
});

// Peticion POST
const createNewPlant = asyncHandler(async (req, res) => {
  const { plantName, desc, variety, plantFrame } = req.body;

  const username = req.user;
  if (!username || !plantName) {
    return res.status(400).json({ message: "Ingresar nombre de la planta" });
  }

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
            plantFrame ? plantFrame : "",
          ];
          pool
            .query(
              "INSERT INTO public.table_plant( plant_name, plant_desc, plant_create_at, plant_variety, plant_frame) VALUES ($1, $2, $3, $4, $5);",
              value
            )
            .then((results2) => {
              if (results2) {
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

// Peticion PATCH
const updatePlant = asyncHandler(async (req, res) => {
  const { id, plantName, desc, variety, active, plantFrame } = req.body;

  if (!id || !plantName || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los Campos son requeridos." });
  }

  pool
    .query(
      "SELECT plant_id, plant_name, plant_desc, plant_variety, plant_status, plant_frame FROM public.table_plant  WHERE plant_id = $1",
      [id]
    )
    .then((result) => {
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
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].plant_name : plantName,
            desc ? desc : result.rows[0].plant_desc,
            active,
            variety ? variety : result.rows[0].plant_variety,
            plantFrame ? plantFrame : result.rows[0].plant_frame,
          ];

          pool
            .query(
              `UPDATE public.table_plant SET plant_name=$1, plant_desc=$2, plant_status=$3, plant_variety=$4, plant_frame=$5	WHERE plant_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
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
const deletePlant = asyncHandler(async (req, res) => {
  const { id } = req.body;

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

module.exports = {
  getAllPlants,
  createNewPlant,
  updatePlant,
  deletePlant,
};
