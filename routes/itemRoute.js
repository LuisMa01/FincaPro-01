const express = require('express')
const router = express.Router()
const itemController = require('../controllers/itemController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT)

router.route('/')
    .get(itemController.getAllItems)
    .post(itemController.createNewItem)
    .patch(itemController.updateItem)
    .delete(itemController.deleteItem)

module.exports = router 