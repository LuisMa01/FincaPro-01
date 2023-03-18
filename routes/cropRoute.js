const express = require('express')
const router = express.Router()
const cropController = require('../controllers/cropController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT)

router.route('/')
    .get(cropController.getAllCrops)
    .post(cropController.createNewCrop)
    .patch(cropController.updateCrop)
    .delete(cropController.deleteCrop)

module.exports = router