const express = require('express')
const router = express.Router()
const { pool } = require('../models/db-conect')
const bcrypt = require("bcrypt")
const { authRole, ROLE } = require('../models/role')
const { render } = require('ejs')


router.get('/auth/user', (req, res) => {
    

    res.render('auth/user', { userName : req.user.user_name, userRole : req.user.rol_user})
})

router.get('/auth/update', (req, res) => {

    res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name})
})


//cambiar contraseña del usuario
router.put('/auth/update/:id', async (req, res) => {
    
    
    const userID = req.params.id
    const pass = req.body.passOld
    const pass1 = req.body.pass1
    const pass2 = req.body.pass2

    try {       

      await pool.query(
        'SELECT * FROM "userSchema"."User" WHERE user_id = $1',
        [userID],
        (err, results) => {
          if (err) {
            throw err;
          }
          console.log(results.rows)
          if (results.rows.length > 0) {
            const user = results.rows[0];
            
            bcrypt.compare(pass, user.password, (err, isMatch) => {
              if (err) {                             
                throw err
              }
              
              if (isMatch) {
                if(pass1 === pass2){
                const hash = bcrypt.hashSync(pass1, 10);
                let values = [hash, userID]
                pool.query('UPDATE "userSchema"."User" SET password= $1 WHERE user_id= $2;', values, (err, resl) =>{
                  if(err){
                    throw err
                  }
                  
                  req.logout
                  res.clearCookie('connect.sid')
                  res.render("./auth/login", { message: "Cambiaste la contraseña exitosamente!", layout: './auth/login'});
                  
                })
                
                } else {                    
                  res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name ,  message2: "Contraseñas no coinciden"})

                }  

              } else {  
                         
              res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name ,  message1: "Contraseña incorrecta"})   
              }
            });  
          } else {
            // No user
            res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name ,  message: "Usurio no encontrado"})   
              
          }
        }
      );      
        
    } catch {
      res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name})
    }
})

router.get('/allUser', authRole(ROLE.ADMIN), async (req, res) => {
  try {
    await pool.query('SELECT user_name, rol	FROM "userSchema"."User" INNER JOIN "userSchema"."user_rol" ON rol_user = rol_id ORDER BY user_name;', (err, result) =>{
      if (err) {
        throw err;
      }

      pool.query('SELECT *	FROM "userSchema"."user_rol" ORDER BY rol', (err2, resultRol) => {
        if (err2) {
          throw err2;
        }
        
        res.render('./auth/allUser', {users : result.rows , rolValue : resultRol.rows})
      })

    })
    
  } catch (error) {
    res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name})
    
  }
})

router.post('/allUser/newUser', authRole(ROLE.ADMIN), (req, res) =>{
  
  const userName = req.body.userNameIn
  const pass = bcrypt.hashSync('1234', 10); 
  
  console.log(req.body.rolVal)

  const value = [userName, pass, req.body.rolVal]
 
   pool.query('SELECT user_name FROM "userSchema"."User" WHERE user_name = $1', [userName], (err, result) =>{
    if (err) {
      throw err;
    }
    
    if(result.rows[0]){
      console.log('usuario existe')
      res.redirect('/allUser')
    } else {
      console.log('usuario no existe');
      pool.query('INSERT INTO "userSchema"."User"(user_name, password, rol_user) VALUES ($1, $2, $3);', value,
      (err, result) =>{
        if (err) {
          throw err;
        }
        console.log(result.rows)
        res.redirect('/allUser')
      })
    }
  })
  

})


module.exports = router