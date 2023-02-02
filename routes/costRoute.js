const express = require('express')
const router = express.Router()
const costController = require('../controllers/costController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(costController.getAllCost)
    .post(costController.createNewCost)
    .patch(costController.updateCost)
    .delete(costController.deleteCost)

module.exports = router 