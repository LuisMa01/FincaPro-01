const express = require('express')
const router = express.Router()
const formController = require('../controllers/formController')
//const verifyJWT = require('../middleware/verifyJWT')

//router.use(verifyJWT)

router.route('/')
    .get(formController.getAllForms)
    .post(formController.createNewForm)
    .patch(formController.updateForm)
    .delete(formController.deleteForm)

module.exports = router