const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");

// Peticion GET para obtener campos
const getAllCamps = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT camp_id, camp_name, camp_area, camp_status, camp_create_at	FROM public.table_camp ORDER BY camp_id ASC;"
    )
    .then((results) => {
      const camp = results.rows;

      if (!camp?.length) {
        return res.status(400).json({ message: "No se encontraron campos" });
      }

      res.json(camp);
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

// Peticion POST para crear nuevos campos
const createNewCamp = asyncHandler(async (req, res) => {
  const { campName, area } = req.body;

  const username = req.user;
  if (!username || !campName) {
    return res.status(400).json({ message: "Ingresar nombre del campo." });
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
        .query("SELECT camp_name FROM public.table_camp WHERE camp_name = $1", [
          campName,
        ])
        .then((results) => {
          const duplCamp = results.rows[0];
          if (duplCamp) {
            return res.status(409).json({ message: "Campo duplicado" });
          }

          const dateN = new Date();

          const value = [campName, area ? area : 0, dateN];
          pool
            .query(
              "INSERT INTO public.table_camp( camp_name, camp_area, camp_create_at) VALUES ($1, $2, $3);",
              value
            )
            .then((results2) => {
              if (results2) {
                return res.status(201).json({ message: `Nuevo campo creado.` });
              } else {
                return res.status(400).json({
                  message: "Datos del campo inválido recibido",
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

// Peticion PATCH para editar campos
const updateCamp = asyncHandler(async (req, res) => {
  const { id, campName, area, active } = req.body;

  if (!id || !campName || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT camp_id, camp_name, camp_area, camp_status FROM public.table_camp  WHERE camp_id = $1",
      [id]
    )
    .then((result) => {
      const camp = result.rows[0].camp_name;
      if (!camp?.length) {
        return res.status(400).json({ message: "No se encontró el campo." });
      }

      pool
        .query(
          "SELECT camp_name FROM public.table_camp  WHERE camp_name = $1",
          [campName]
        )
        .then(async (resultName) => {
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].camp_name : campName,
            area ? area : result.rows[0].camp_area,
            active,
          ];

          pool
            .query(
              `UPDATE public.table_camp SET camp_name=$1, camp_area=$2, camp_status=$3	WHERE camp_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              if (valueUpdate) {
                return res.json({
                  message: `Campo actualizado. ${
                    duplicate ? " Campo duplicado" : ""
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

// Peticion DELETE para eliminar campos
const deleteCamp = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "ID del campo requerido" });
  }

  pool
    .query(`SELECT camp_id FROM public.table_camp WHERE camp_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Campo no encontrado" });
      }
      pool
        .query(`DELETE FROM public.table_camp WHERE camp_id = ${id}`)
        .then(() => {
          return res.json({ message: "Campo eliminado." });
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
  getAllCamps,
  createNewCamp,
  updateCamp,
  deleteCamp,
};
