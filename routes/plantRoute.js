const express = require('express')
const router = express.Router()
const plantController = require('../controllers/plantController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(plantController.getAllPlants)
    .post(plantController.createNewPlant)
    .patch(plantController.updatePlant)
    .delete(plantController.deletePlant)

module.exports = router