const express = require('express')
const router = express.Router()
const { pool } = require('../models/db-conect')
const bcrypt = require("bcrypt")


router.get('/auth/user', (req, res) => {
    

    res.render('auth/user', { userName : req.user.user_name})
})

router.get('/auth/update', (req, res) => {

    res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name})
})

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
                          console.log(resl)
                          req.logout
                          res.render("./auth/login", { message: "Cambiaste la contraseña exitosamente!", layout: './auth/login'});
                          
                        })
                        
                        } else {
                            console.log('cai en contraseña no pareja') 
                            res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name ,  message: "Contraseñas no coinciden"})

                        }            


                      
                    } else {  
                        console.log('cai en contraseña incorecta')             
                    res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name ,  message: "Contraseña incorrecta"})   
                    }
                  });  
                } else {
                  // No user
                  console.log('cai en usuario')
                  res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name ,  message: "Usurio no encontrado"})   
                   
                }
              }
            );       
        
    } catch {
        console.log('cai en el catch')
        res.render('auth/update', {userID : req.user.user_id, userName : req.user.user_name})
    }
})





module.exports = router