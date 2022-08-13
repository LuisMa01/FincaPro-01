const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const { pool } = require('../models/db-conect')

function initialize(passport) {
    
  const authenticateUser = (username, password, done) => {
    pool.query(
      'SELECT * FROM "userSchema"."User" WHERE user_name = $1',
      [username],
      (err, results) => {
        if (err) {
          throw err;
        }
          
        if (results.rows.length > 0) {
          const user = results.rows[0];
                    
          // una vez encriptada la contraseña en la base de datos, hay que borrar hash 
          // y colocar en hash user.password
          //const hash = bcrypt.hashSync(user.password, 10); 
          
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {                             
              throw err
            }
            
            if (isMatch) {
              return done(null, user);
            } else {               
              return done(null, false, { message: "Contraseña Incorrecta." });
            }
          });  
        } else {
          // No user
          return done(null, false, {
            message: "Usuario no existe."
          });
        }
      }
    );
  };


  passport.use(new LocalStrategy({ username: 'usename'}, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.user_id))
  passport.deserializeUser((id, done) => {
    pool.query('SELECT * FROM "userSchema"."User" WHERE user_id = $1', [id], (err, results) =>{
      if (err) {
        return done(err);
      }
      console.log(results.rows[0]);
      return done(null, results.rows[0]);
    });
  })
    
    

    //return done(null, getUserById(id))
    console.log('authenticateUser')
  
}

module.exports = initialize