const express = require('express')
const router = express.Router()


router.get('/auth/user', (req, res) => {
    

    res.render('auth/user')
})

router.get('/auth/update', (req, res) => {

    

    res.render('auth/update')
})





module.exports = router