const express = require('express')
const router = express.Router()
const { authRole, ROLE } = require('../models/role')


router.get('/', (req, res) => {
    
    console.log(req.user.rol_user)

    res.render('index')
})

module.exports = router