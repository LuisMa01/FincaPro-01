
const { logEvents } = require("../middleware/logger");
const { pool } = require("../config/db-conect");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req, res) => {
  // Get all users from MongoDB
  pool
    .query(
      'SELECT user_id, user_name, rol_user, nombres, apellidos, activo, email, cell FROM "userSchema"."User" ORDER BY user_id ASC'
    )
    .then((results) => {
      //res.send(results.rows)
      const users = results.rows;
      // If no users
      if (!users?.length) {
        return res.status(400).json({ message: "No users found" });
      }

      res.json(users);
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

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles } = req.body;

  // Confirm data
  /*
  if (!username || !password || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: "All fields are required" });
  }
  */
  if (!username || !password || !roles) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate username`
  await pool
    .query('SELECT user_name FROM "userSchema"."User" WHERE user_name = $1', [
      username,
    ])
    .then(async (results) => {
      const duplicate = results.rows[0];
      // If no users
      if (duplicate) {
        return res.status(409).json({ message: "Duplicate username" });
      }
      // Hash password
      const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

      const value = [username, hashedPwd, roles];

      // Create and store new user

      pool
        .query(
          'INSERT INTO "userSchema"."User"(user_name, password, rol_user) VALUES ($1, $2, $3);',
          value
        )
        .then((results2) => {
          if (results2) {
            //created
            return res.status(201).json({ message: `New user created` });
          } else {
            return res
              .status(400)
              .json({ message: "Invalid user data received" });
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

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (req, res) => {
  const { id, username, roles, active, password, names, surname, email, cell } =
    req.body;

  // Confirm data
  if (!id || !username || !roles || typeof active !== "boolean") {
    return res
      .status(400)
      .json({ message: "All fields except password are required" });
  }

  //if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
  //    return res.status(400).json({ message: 'All fields except password are required' })
  //}

  // Does the user exist to update?

  pool
    .query(
      'SELECT user_id, user_name, password, rol_user, nombres, apellidos, activo, email, cell FROM "userSchema"."User" WHERE user_id = $1',
      [id]
    )
    .then((result) => {
      // If no users
      const user = result.rows[0].user_name;
      if (!user?.length) {
        return res.status(400).json({ message: "No users found" });
      }

      pool
        .query(
          'SELECT user_name FROM "userSchema"."User" WHERE user_name = $1',
          [username]
        )
        .then(async (resultName) => {
          // If no users
          const duplicate = resultName.rows[0];

          if (password) {
            // Hash password
            hashP = await bcrypt.hash(password, 10); // salt rounds
          }

          const valueInto = [
            duplicate ? result.rows[0].user_name : username,
            password ? hashP : result.rows[0].password,
            roles ? roles : result.rows[0].rol_user,
            names ? names : result.rows[0].nombres,
            surname ? surname : result.rows[0].apellidos,
            active ? active : result.rows[0].activo,
            email ? email : result.rows[0].email,
            cell ? cell : result.rows[0].cell,
          ];

          pool
            .query(
              `UPDATE "userSchema"."User"	SET user_name=$1, password=$2, rol_user=$3, nombres=$4, apellidos=$5, activo=$6, email=$7, cell=$8	WHERE user_id= ${id}`,
              valueInto
            )
            .then((valueUpdate) => {
              // usuario actualizado

              if (valueUpdate) {
                return res.json({
                  message: `usuario Actualizado.${
                    duplicate ? " Nombre de usuario duplicado" : ""
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

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "User ID Required" });
  }

  // Does the user still have assi gned notes?
  pool
    .query(`SELECT user_id FROM "userSchema"."User" WHERE user_id = ${id}`)
    .then((exist) => {
      

      // usuario 
      if (!exist.rows[0]) {
        return res.status(400).json({ message: "User not found" });
      }
      pool
        .query(`DELETE FROM "userSchema"."User" WHERE user_id = ${id}`)
        .then(() => {
          // usuario borrado
          
          return res.json({ message: "Usurio borrado" });
          
          
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
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
