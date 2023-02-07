const express = require('express')
const router = express.Router()
const appController = require('../controllers/appController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(appController.getAllApps)
    .post(appController.createNewApp)
    .patch(appController.updateApp)
    .delete(appController.deleteApp)

module.exports = router 