const express = require('express')
const methodOverride = require('method-override')

const { pool } = require('./models/db-conect')
const bcrypt = require("bcrypt")
const session = require("express-session")
const passport = require("passport")
const flash = require('express-flash')
const expressLayouts = require('express-ejs-layouts')


const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express()

//

//setting
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layouts/layout')


//Middlewares
app.use(expressLayouts)
app.use(express.static('public'))
app.use(methodOverride('_method'))
app.use(express.urlencoded({ extended: true}))
app.use(cookieParser(process.env.SECRETO))
app.use(flash())


app.use(session({
    secret: process.env.SECRETO,
    resave: true,
    saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session())


const initializePassport = require('./config/passport-config')


initializePassport(passport)



//metodo y ruta visitada
app.use((req,res,next) => {
    console.log(`${req.method} ${req.path}`)
    next()
})
/* nota de como hacer query
const ti = 'user'
const te = '1234'
const consulta = pool.query('select * from "userSchema"."User" WHERE user_name = $1', [ti], (err, results) => {
    if(err){
        throw err
    }
    console.log(results.rows[0].user_name)
    console.log(results.rows[0].password)
    const hash = bcrypt.hashSync(te, 10);
    
    let values = [hash, results.rows[0].user_name]
    pool.query('UPDATE "userSchema"."User" SET password= $1 WHERE user_name= $2;', values, (err, res) =>{
      if(err){
        throw err
      }
      console.log(results.rows[0].user_name)
      console.log(res.rows)
      
    })
    
    
})
*/
/*
const teta = pool.query('SELECT * FROM "userSchema".user_rol ORDER BY rol_id ASC ',
(err, results) => {
    if (err) {
      throw err;
    }

  console.log(results.rows.length)
  console.log('hasta aqui')
})

*/





//Proceso de login

app.get('/auth/login', checkNotAuthenticated, (req, res) => {

    res.render('auth/login',{ layout: './auth/login' })
    
})

app.post('/auth/login', checkNotAuthenticated, passport.authenticate("local", {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true
}))

app.get("/auth/logout", (req, res) => {
  
  //res.clearCookie();
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

app.listen(process.env.PORT || 5000)