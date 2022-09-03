const express = require("express");
//const methodOverride = require("method-override");
const cors = require("cors");
const { sign } = require("jsonwebtoken");
const { serialize } = require("cookie");

const { pool } = require("./models/db-conect");
const bcrypt = require("bcrypt");
//const session = require("express-session");
//const passport = require("passport");

const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();

app.use(express.json());

//app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
/*
app.use(
  session({
    secret: process.env.SECRETO,
    resave: true,
    saveUninitialized: true,
  })
);
*/
//app.use(passport.initialize());
//app.use(passport.session());

//const initializePassport = require("./config/passport-config");

//initializePassport(passport);

const allowedOrigins = ["http://localhost:3000", "http://localhost:5000","*"];
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  method: ['GET', 'PUT', 'POST'],
  Credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const secreto = process.env.SECRETO;

//Proceso de login

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
 
  pool.query(
    'SELECT * FROM "userSchema"."User" ORDER BY user_id ASC',
    (err, results) => {
      if (err) {
        throw err;
      }
      const token = sign(
        {
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1, // 1 days
          username: 'loco',
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
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader("Set-Cookie", serialised);
      

      res.send(results.rows);
    }
  );
});

/*
app.get('/auth/login', checkNotAuthenticated, (req, res) => {

    res.render()
    
})

app.post('/auth/login', checkNotAuthenticated, passport.authenticate("local", {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true
}))
app.post('/auth/login', checkNotAuthenticated, passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
    res.redirect('/');
  });


app.get("/auth/logout", (req, res) => {  
  res.clearCookie('connect.sid') 
  
  req.logout
  res.render("./auth/login", { message: "Saliste de sesión exitosamente!", layout: './auth/login'});
})


//Acceso a la app con autenticacion

const indexRouter = require('./routes/index')
app.use('/', checkAuthenticated, indexRouter)


//Acceso update password

const userRouter = require('./routes/user')
app.use('/', checkAuthenticated, userRouter)




//funcion para verificar autenticacion
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }  
    res.redirect('/auth/login')
}
  
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        
      return res.redirect('/')
    }
    next()
}
*/

app.listen(process.env.PORT || 5000);
