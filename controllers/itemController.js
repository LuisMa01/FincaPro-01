const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");

// @desc Get all
// @route GET /item
// @access Private
const getAllItems = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT item_id, item_name, item_desc, item_price, item_create_at, item_create_by, item_status, item_dose_key FROM public.table_item ORDER BY item_id ASC "
    )
    .then((results) => {
      //res.send(results.rows)
      const item = results.rows;
      // If no users
      if (!item?.length) {
        return res.status(400).json({ message: "No se encontraron Items" });
      }

      res.json(item);
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
// @route POST /item
// @access Private
const createNewItem = asyncHandler(async (req, res) => {
  const { username, itemName, desc, itemPrice, itemDose } = req.body;

  if (!username || !itemName || !itemDose) {
    return res
      .status(400)
      .json({ message: "Ingresar nombre de los campos requeridos." });
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
        .query("SELECT item_name FROM public.table_item WHERE item_name = $1", [
          itemName,
        ])
        .then((results) => {
          const duplItem = results.rows[0];
          if (duplItem) {
            return res.status(409).json({ message: "Item duplicada" });
          }

          const dateN = new Date();

          const value = [
            itemName,
            desc ? desc : "",
            itemPrice ? itemPrice : 0,
            dateN,
            userAdmin.user_id,
            itemDose,
          ];
          //username, itemName, desc, itemPrice, itemDose
          pool
            .query(
              "INSERT INTO public.table_item( item_name, item_desc, item_price, item_create_at, item_create_by, item_dose_key) VALUES ($1, $2, $3, $4, $5, $6);",
              value
            )
            .then((results2) => {
              if (results2) {
                //created
                return res.status(201).json({ message: `Nuevo item creado.` });
              } else {
                return res.status(400).json({
                  message: "Datos del item inválido recibido",
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
// @route PATCH /item
// @access Private
const updateItem = asyncHandler(async (req, res) => {
  const { id, itemName, desc, itemPrice, active, itemDose } = req.body;

  // Confirm data
  if (!id || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT item_id, item_name, item_desc, item_price, item_status, item_dose_key FROM public.table_item WHERE item_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
      const item = result.rows[0].item_name;
      if (!item?.length) {
        return res.status(400).json({ message: "No se encontró el item." });
      }

      pool
        .query(
          "SELECT item_name FROM public.table_item  WHERE item_name = $1",
          [itemName]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].item_name : itemName,
            desc ? desc : result.rows[0].item_desc,
            itemPrice ? itemPrice : result.rows[0].item_price,
            active,
            itemDose ? itemDose : result.rows[0].item_dose_key,
          ];

          pool
            .query(
              `UPDATE public.table_item SET item_name=$1, item_desc=$2, item_price=$3, item_status=$4, item_dose_key=$5 WHERE item_id=${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              if (valueUpdate) {
                return res.json({
                  message: `Item actualizada. ${
                    duplicate ? " item duplicada" : ""
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
// @route DELETE /item
// @access Private
const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "ID del item requerida" });
  }

  pool
    .query(`SELECT item_id FROM public.table_item WHERE item_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Item no encontrado" });
      }
      pool
        .query(`DELETE FROM public.table_item WHERE item_id = ${id}`)
        .then(() => {
          return res.json({ message: "Item eliminado." });
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
  getAllItems,
  createNewItem,
  updateItem,
  deleteItem,
};