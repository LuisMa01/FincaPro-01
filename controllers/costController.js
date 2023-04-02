const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all
// @route GET /cost
// @access Private

const getAllCost = asyncHandler(async (req, res) => {
  pool
    .query(
      "SELECT cost_id, cost_item_key, cost_user_key, cost_quantity, cost_item_price, cost_price, cost_date,  cost_date_key, item_dose_key, item_name, crop_camp_key, crop_plant_key, date_act_key, date_crop_key, dose_name, dose_unit, act_name FROM public.table_cost INNER JOIN public.table_item ON cost_item_key = item_id INNER JOIN public.table_app_date on date_id = cost_date_key INNER JOIN public.table_crop ON crop_id = date_crop_key INNER JOIN public.table_dose on dose_id = item_dose_key INNER JOIN public.table_activity on act_id = date_act_key ORDER BY cost_id ASC;"
    )
    .then((results) => {
      //res.send(results.rows)
      const cost = results.rows;
      // If no users
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
        return res.status(400).json({ message: "no fue posible" })
        //throw err;
      });
    });
});

// @desc Create new
// @route POST /cost
// @access Private
const createNewCost = asyncHandler(async (req, res) => {
  const { costItemKey, costQuantity, costDateKey } =
    req.body;

    const username = req.user
  //cost_item_key, cost_user_key, cost_labor, cost_quantity, cost_item_price, cost_price, cost_date, cost_date_key

  if (!username || !costItemKey || !costDateKey) {
    return res.status(400).json({ message: "Llenar los campos requeridos" });
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
          "SELECT item_id, item_price FROM public.table_item WHERE item_id = $1",
          [costItemKey]
        )
        .then((results) => {
          const item = results.rows[0];
          if (!item) {
            return res.status(409).json({ message: "Item no existe" });
          }

          //costItemKey, costLabor, costQuantity, costDateKey
          let costPrice = 0;
          if (item.item_price) {
            costPrice = item.item_price * costQuantity;
          }

          const dateN = new Date();
          const value = [
            costItemKey,
            userAdmin.user_id,
            costQuantity ? costQuantity : 0,
            item.item_price,
            costPrice,
            dateN,
            costDateKey,
          ];
          pool
            .query(
              "INSERT INTO public.table_cost(cost_item_key, cost_user_key, cost_quantity, cost_item_price, cost_price, cost_date, cost_date_key) VALUES ($1, $2, $3, $4, $5, $6, $7);",
              value
            )
            .then((results2) => {
              if (results2) {
                //created
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
// @route PATCH /cost
// @access Private
const updateCost = asyncHandler(async (req, res) => {
  const { id, costItemKey, costQuantity, costDateKey, costItemPrice } =
    req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "Los Campos son requeridos." });
  }

  pool
    .query(
      "SELECT cost_id, cost_item_key, cost_item_price, cost_price, cost_date_key, item_dose_key FROM public.table_cost INNER JOIN public.table_item ON cost_item_key = item_id WHERE cost_id = $1",
      [id]
    )
    .then((result) => {
      // If no users
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
          // If no users
          const item = resultName.rows[0];

          let price = cost.cost_item_price

          if (costItemKey !== cost.cost_item_key ) {
            price = item.item_price
          }
          if (costItemPrice) {
            price = costItemPrice
          }

          let costPrice = price * costQuantity;

          //costItemKey, costLabor, costQuantity, costDateKey, costPrice

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
              // usuario actualizado

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
// @route DELETE /cost
// @access Private
const deleteCost = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
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
  getAllCost,
  createNewCost,
  updateCost,
  deleteCost,
};
