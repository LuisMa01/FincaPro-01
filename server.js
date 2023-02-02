require("dotenv").config();
const express = require("express");
const cors = require("cors");

const path = require("path");
const { pool } = require("./config/db-conect");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const app = express();
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

console.log(process.env.NODE_ENV);

const corsOptions = require("./config/corsOptions");
app.use(logger);

app.use(cors(corsOptions));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const secreto = process.env.SECRETO;

//Proceso de login
/*
app.post("/login/user", (req, res) => {
  // check if user that match req.email and req.password return user user_id, user_name, user_rol

  const { user, password, isEmail } = req.body;

  console.log(user + password + isEmail);
  console.log(req.body.user);
  if (isEmail) {
    pool.query(
      'SELECT * FROM "userSchema"."User" WHERE email = $1',
      [user],
      (err, results) => {
        if (err) {
          throw err;
        }
        if (results.rows.length > 0) {
          const userDB = results.rows[0];
          if (bcrypt.compareSync(password, userDB.password)) {
            //req.session.user = user;
            // res user
            //COMIENZA EL TOKEN
            const token = sign(
              {
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1, // 30 days
                username: userDB.user_name,
              },
              secreto
            );

            const serialised = serialize("OursiteJWT", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV !== "development",
              sameSite: "strict",
              maxAge: 60 * 60 * 24 * 1,
              path: "/",
            });
            
          

            res.setHeader("Set-Cookie", serialised);

            res.status(200).json({ message: "Success!" });

            //TERMINA EL TOKEN

            //res.send({ data: userDB });
          } else {
            res.status(401).send({ message: "Unauthorized" });
          }
        } else {
          res.status(404).send({ message: "No found" });
        }
      }
    );
  } else {
    pool.query(
      'SELECT * FROM "userSchema"."User" WHERE user_name = $1',
      [user],
      (err, results) => {
        if (err) {
          throw err;
        }
        if (results.rows.length > 0) {
          const userDB = results.rows[0];
          if (bcrypt.compareSync(password, userDB.password)) {
            //req.session.user = user;
            // res user
            //COMIENZA EL TOKEN
            const token = sign(
              {
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1, // 1 days
                username: userDB.user_name,
              },
              secreto
            );
            

            const serialised = serialize("OursiteJWT", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV !== "development",
              sameSite: "Lax",
              maxAge: 60 * 60 * 24 * 1,
              path: "/",
            });
            
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Credentials', true)
            res.setHeader("Set-Cookie", serialised);
            
            

            res.status(200).json({ message: "Success!"});

            //TERMINA EL TOKEN
            //res.send({ data: userDB });
          } else {
            res.status(401).send({ message: "Unauthorized" });
          }
        } else {
          res.status(404).send({ message: "No found" });
        }
      }
    );
  }
});

app.get("/logout", (req, res) => {
  const { cookies } = req;

  const jwt = cookies.OursiteJWT;

  if (!jwt) {
    res.json({ message: "Ya no estás logeado." });
  } else {
    const serialised = serialize("OursiteJWT", null, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: -1,
      path: "/",
    });

    res.setHeader("Set-Cookie", serialised);

    res.status(200).json({ message: "Successfuly logged out!" });
  }
});




app.get("/user", (req, res) => {
 
  pool.query('SELECT user_id, user_name, rol_user, nombres, apellidos, activo, email, cell FROM "userSchema"."User" ORDER BY user_id ASC')
  .then(results =>{
    res.send(results.rows)
    pool.end()
  })
  .catch(err => {    
    setImmediate(async () => {
      await logEvents(`${err.code}\t ${err.routine}\t${err.file}\t${err.stack}`,'postgresql.log');
      throw err
    })
  })
})
*/

app.use("/", express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/act", require("./routes/actRoute"));
app.use("/plant", require("./routes/plantRoute"));
app.use("/camp", require("./routes/campRoute"));
app.use("/dose", require("./routes/doseRoute"));
app.use("/form", require("./routes/formRoute"));
app.use("/crop", require("./routes/cropRoute"));
app.use("/app", require("./routes/appRoute"));
app.use("/item", require("./routes/itemRoute"));
app.use("/cost", require("./routes/costRoute"));

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

app.listen(process.env.PORT || 5000);
