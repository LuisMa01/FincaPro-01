const express = require('express')
const router = express.Router()
const campController = require('../controllers/campController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(campController.getAllCamps)
    .post(campController.createNewCamp)
    .patch(campController.updateCamp)
    .delete(campController.deleteCamp)

module.exports = router