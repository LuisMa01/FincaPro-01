const { pool } = require('./db-conect')

const ROLE = {
    ADMIN: 'admin',
    USER: 'user',
    SUPERVISOR: 'supervisor'
}


function authRole(role) {
    console.log([role])
    return (req, res, next) => {
        pool.query('SELECT * FROM "userSchema".user_rol WHERE rol = $1',
        [role],
        (err, results) => {
            console.log('hasta aqui')
            if (err) {
                throw err;
            }       
            
            const r = results.rows[0].rol_id;
            
            if (req.user.rol_user !== r) {
                res.status(401)
                return res.send('Not allowed')
            }
        
            next()  
        })
    }
}

module.exports = { authRole, ROLE }