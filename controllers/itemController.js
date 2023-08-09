const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");

// Seccion de ARTICULOS
//peticion GET
const getAllItems = asyncHandler(async (req, res) => {
  pool
    .query(
      `SELECT item_id, item_name, item_desc, item_price, item_create_at, item_status, item_dose_key, dose_name, dose_unit 
      FROM public.table_item 
      LEFT JOIN public.table_dose ON item_dose_key = dose_id 
      ORDER BY item_id ASC`
    )
    .then((results) => {
      const item = results.rows;

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
        return res.status(400).json({ message: "no fue posible" });
      });
    });
});

// Peticion POST
const createNewItem = asyncHandler(async (req, res) => {
  const { itemName, desc, itemPrice, itemDose } = req.body;
  let itemPrecio;

  const username = req.user;
  itemPrecio = parseFloat(itemPrice).toFixed(2);

  if (!username || !itemName || !itemDose) {
    return res
      .status(400)
      .json({ message: "Ingresar nombre de los campos requeridos." });
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
            itemPrecio ? itemPrecio : 0,
            dateN,
            itemDose,
          ];

          pool
            .query(
              "INSERT INTO public.table_item( item_name, item_desc, item_price, item_create_at, item_dose_key) VALUES ($1, $2, $3, $4, $5);",
              value
            )
            .then((results2) => {
              if (results2) {
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

// Peticion PATCH
const updateItem = asyncHandler(async (req, res) => {
  const { id, itemName, desc, itemPrice, active, itemDose } = req.body;

  let itemPrecio = parseFloat(itemPrice).toFixed(2);

  if (!id || typeof active !== "boolean") {
    return res.status(400).json({ message: "Los campos son requeridos." });
  }

  pool
    .query(
      "SELECT item_id, item_name, item_desc, item_price, item_status, item_dose_key FROM public.table_item WHERE item_id = $1",
      [id]
    )
    .then((result) => {
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
          const duplicate = resultName.rows[0];

          const valueInto = [
            duplicate ? result.rows[0].item_name : itemName,
            desc ? desc : result.rows[0].item_desc,
            itemPrecio ? itemPrecio : result.rows[0].item_price,
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
const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.body;

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
  getAllItems,
  createNewItem,
  updateItem,
  deleteItem,
};
