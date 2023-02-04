const express = require('express')
const router = express.Router()
const comController = require('../controllers/comController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(comController.getAllCom)
    .post(comController.createNewCom)
    .patch(comController.updateCom)
    .delete(comController.deleteCom)

module.exports = router 