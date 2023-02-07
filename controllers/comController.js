const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all act
// @route GET /act
// @access Private
/*
SELECT comt_id, comt_date, comt_desc, comt_user_key, comt_date_key, date_act_key, date_crop_key
	FROM public.table_comment
	INNER JOIN public.table_app_date ON date_id = comt_date_key
	ORDER BY comt_id ASC;

  SELECT comt_id, comt_date, comt_desc, comt_user_key, comt_date_key, date_act_key, date_crop_key	FROM public.table_comment INNER JOIN public.table_app_date ON date_id = comt_date_key	ORDER BY comt_id ASC;
*/
const getAllCom = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT comt_id, comt_date, comt_desc, comt_user_key, comt_date_key, date_act_key, date_crop_key	FROM public.table_comment INNER JOIN public.table_app_date ON date_id = comt_date_key	ORDER BY comt_id ASC;"
    )
    .then((results) => {
      //res.send(results.rows)
      const commt = results.rows;
      // If no users
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
        //throw err;
      });
    });
});

// @desc Create new act
// @route POST /act
// @access Private
const createNewCom = asyncHandler(async (req, res) => {
  const { username, desc, comtDateKey } = req.body;

  //comt_date, comt_desc, comt_user_key, comt_date_key,

  if (!username || !desc || !comtDateKey) {
    return res.status(400).json({ message: "Llenar loc campos requeridos." });
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

      const dateN = new Date();
      const value = [
        dateN, 
        desc ? desc : "", 
        userAdmin.user_id, 
        comtDateKey
      ];
      pool
        .query(
          "INSERT INTO public.table_comment(comt_date, comt_desc, comt_user_key, comt_date_key) VALUES ($1, $2, $3, $4);",
          value
        )
        .then((results2) => {
          
          if (results2) {
            //created
            return res.status(201).json({ message: `Nuevo comentario creado.` });
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

// @desc Update a act
// @route PATCH /act
// @access Private
const updateCom = asyncHandler(async (req, res) => {
  const { id, desc, comtDateKey } = req.body;

  // Confirm data
  if (!id || !desc || !comtDateKey) {
    return res
      .status(400)
      .json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT comt_id, comt_desc, comt_date_key FROM public.table_comment  WHERE comt_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const comt = result.rows[0].comt_desc;
      if (!comt?.length) {
        return res.status(400).json({ message: "No se encontró el comentario." });
      }

      pool
        .query(
          "SELECT date_id FROM public.table_app_name  WHERE date_id = $1",
          [comtDateKey]
        )
        .then(async (resultName) => {
          // If no users
          const appDate = resultName.rows[0].date_id;

          const valueInto = [
            desc ? desc : result.rows[0].comt_desc,
            appDate,
          ];

          pool
            .query(
              `UPDATE public.table_comment SET comt_desc=$1, comt_date_key=$2	WHERE comt_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              // usuario actualizado

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
const deleteCom = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
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
  getAllCom,
  createNewCom,
  updateCom,
  deleteCom,
};
