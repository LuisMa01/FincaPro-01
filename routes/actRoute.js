const express = require('express')
const router = express.Router()
const actController = require('../controllers/actController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT)

router.route('/')
    .get(actController.getAllAct)
    .post(actController.createNewAct)
    .patch(actController.updateNoteAct)
    .delete(actController.deleteNoteAct)

module.exports = router