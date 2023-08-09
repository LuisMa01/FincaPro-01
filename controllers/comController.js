const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// Seccion de COMENTARIOS
// Peticion GET
const getAllCom = asyncHandler(async (req, res) => {
  pool
    .query(
      `SELECT comt_id, comt_date, comt_desc, comt_user_key, comt_date_key, date_act_key, date_crop_key, act_name, crop_harvest, crop_status	
      FROM public.table_comment 
      LEFT JOIN public.table_app_date ON date_id = comt_date_key 
      LEFT JOIN public.table_crop ON crop_id = date_crop_key 
      LEFT JOIN public.table_activity ON act_id = date_act_key	
      ORDER BY comt_id ASC;`
    )
    .then((results) => {
      const commt = results.rows;

      if (!commt?.length) {
        return res
          .status(400)
          .json({ message: "No se encontraron comentarios" });
      }

      res.json(commt);
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

// Peticion POST
const createNewCom = asyncHandler(async (req, res) => {
  const { desc, comtDateKey } = req.body;

  const username = req.user;
  if (!username || !desc || !comtDateKey) {
    return res.status(400).json({ message: "Llenar loc campos requeridos." });
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

      const dateN = new Date();
      const value = [dateN, desc ? desc : "", userAdmin.user_id, comtDateKey];
      pool
        .query(
          "INSERT INTO public.table_comment(comt_date, comt_desc, comt_user_key, comt_date_key) VALUES ($1, $2, $3, $4);",
          value
        )
        .then((results2) => {
          if (results2) {
            return res
              .status(201)
              .json({ message: `Nuevo comentario creado.` });
          } else {
            return res.status(400).json({
              message: "Datos del comentario inválidos recibidos",
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
});

// Peticion PATCH
const updateCom = asyncHandler(async (req, res) => {
  const { id, desc, comtDateKey } = req.body;

  if (!id || !desc || !comtDateKey) {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT comt_id, comt_desc, comt_date_key FROM public.table_comment  WHERE comt_id = $1",
      [id]
    )
    .then((result) => {
      const comt = result.rows[0].comt_desc;
      if (!comt?.length) {
        return res
          .status(400)
          .json({ message: "No se encontró el comentario." });
      }

      pool
        .query(
          "SELECT date_id FROM public.table_app_date  WHERE date_id = $1",
          [comtDateKey]
        )
        .then(async (resultName) => {
          const appDate = resultName.rows[0].date_id;

          const valueInto = [desc ? desc : result.rows[0].comt_desc, appDate];

          pool
            .query(
              `UPDATE public.table_comment SET comt_desc=$1, comt_date_key=$2	WHERE comt_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              if (valueUpdate) {
                return res.json({
                  message: `Comentario actualizado.`,
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
const deleteCom = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "ID de la actividad requerida" });
  }

  pool
    .query(`SELECT comt_id FROM public.table_comment WHERE comt_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Comentario no encontrado." });
      }
      pool
        .query(`DELETE FROM public.table_comment WHERE comt_id = ${id}`)
        .then(() => {
          return res.json({ message: "Commentario eliminado." });
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
  getAllCom,
  createNewCom,
  updateCom,
  deleteCom,
};
