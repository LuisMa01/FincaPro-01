const express = require('express')
const router = express.Router()
const doseController = require('../controllers/doseController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(doseController.getAllDoses)
    .post(doseController.createNewDose)
    .patch(doseController.updateDose)
    .delete(doseController.deleteDose)

module.exports = router