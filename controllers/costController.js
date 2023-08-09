const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// Seccion de COSTOS
//peticion GET
const getAllCost = asyncHandler(async (req, res) => {
  pool
    .query(
      `SELECT 
      cost_id, 
      cost_item_key, 
      cost_quantity, 
      cost_item_price, 
      cost_price, 
      cost_date,  
      cost_date_key, 
      item_dose_key, 
      item_name, 
      crop_camp_key, 
      crop_plant_key,
      crop_harvest, 
      crop_status, 
      date_act_key, 
      date_crop_key, 
      dose_name, 
      dose_unit, 
      act_name,
      crop_name,
      camp_name,
      plant_name
      FROM public.table_cost 
      LEFT JOIN public.table_item ON cost_item_key = item_id 
      LEFT JOIN public.table_app_date on date_id = cost_date_key 
      LEFT JOIN public.table_crop ON crop_id = date_crop_key 
      LEFT JOIN public.table_dose ON dose_id = item_dose_key 
      LEFT JOIN public.table_activity ON act_id = date_act_key 
      LEFT JOIN public.table_camp ON camp_id = crop_camp_key 
      LEFT JOIN public.table_plant ON plant_id = crop_plant_key 
      ORDER BY cost_id ASC;`
    )
    .then((results) => {
      const cost = results.rows;

      if (!cost?.length) {
        return res.status(400).json({ message: "No se encontro" });
      }

      res.json(cost);
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
const createNewCost = asyncHandler(async (req, res) => {
  const { costItemKey, costQuantity, costDateKey } = req.body;

  const username = req.user;

  if (!username || !costItemKey || !costDateKey) {
    return res.status(400).json({ message: "Llenar los campos requeridos" });
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
        if (userAdmin.user_rol !== 2) {
          return res
            .status(403)
            .json({ message: "El usuario no está autorizado" });
        }
      }

      pool
        .query(
          "SELECT item_id, item_price FROM public.table_item WHERE item_id = $1",
          [costItemKey]
        )
        .then((results) => {
          const item = results.rows[0];
          if (!item) {
            return res.status(409).json({ message: "Item no existe" });
          }

          let costPrice = 0;
          if (item.item_price) {
            costPrice = item.item_price * costQuantity;
          }

          const dateN = new Date();
          const value = [
            costItemKey,
            costQuantity ? costQuantity : 0,
            item.item_price,
            costPrice,
            dateN,
            costDateKey,
          ];
          pool
            .query(
              "INSERT INTO public.table_cost(cost_item_key, cost_quantity, cost_item_price, cost_price, cost_date, cost_date_key) VALUES ($1, $2, $3, $4, $5, $6);",
              value
            )
            .then((results2) => {
              if (results2) {
                return res.status(201).json({ message: `item insertado.` });
              } else {
                return res.status(400).json({
                  message: "Datos del item inválido recibidos",
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
const updateCost = asyncHandler(async (req, res) => {
  const { id, costItemKey, costQuantity, costDateKey, costItemPrice } =
    req.body;

  if (!id) {
    return res.status(400).json({ message: "Los Campos son requeridos." });
  }

  pool
    .query(
      "SELECT cost_id, cost_item_key, cost_item_price, cost_price, cost_date_key, item_dose_key FROM public.table_cost LEFT JOIN public.table_item ON cost_item_key = item_id WHERE cost_id = $1",
      [id]
    )
    .then((result) => {
      const cost = result.rows[0].cost_id;
      if (!cost?.length) {
        return res.status(400).json({ message: "No se encontró el item" });
      }

      pool
        .query(
          "SELECT item_id, item_price FROM public.table_item WHERE item_id = $1",
          [costItemKey]
        )
        .then(async (resultName) => {
          const item = resultName.rows[0];

          let price = cost.cost_item_price;

          if (costItemKey !== cost.cost_item_key) {
            price = item.item_price;
          }
          if (costItemPrice) {
            price = costItemPrice;
          }

          let costPrice = price * costQuantity;

          const valueInto = [
            costItemKey ? costItemKey : cost.cost_item_key,
            costQuantity ? costQuantity : cost.cost_quantity,
            price,
            costPrice,
            costDateKey,
          ];

          pool
            .query(
              `UPDATE public.table_cost SET cost_item_key=$1, cost_quantity=$2, cost_item_price=$3, cost_price=$4, cost_date_key=$5 WHERE act_id= ${id};`,
              valueInto
            )
            .then((valueUpdate) => {
              if (valueUpdate) {
                return res.json({
                  message: `Item actualizado.`,
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
const deleteCost = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "ID de la actividad requerida" });
  }

  pool
    .query(`SELECT cost_id FROM public.table_cost WHERE cost_id = ${id}`)
    .then((exist) => {
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "Items no encontrada" });
      }
      pool
        .query(`DELETE FROM public.table_cost WHERE cost_id = ${id}`)
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
  getAllCost,
  createNewCost,
  updateCost,
  deleteCost,
};
