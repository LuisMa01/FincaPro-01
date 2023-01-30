const express = require('express')
const router = express.Router()
const actController = require('../controllers/actController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(actController.getAllActs)
    .post(actController.createNewAct)
    .patch(actController.updateAct)
    .delete(actController.deleteAct)

module.exports = router 