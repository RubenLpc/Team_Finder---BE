const {Router} = require('express')
const { register, login, protected, logout, register_admins } = require('../controllers/auth')
const { registerValidation, loginValidation } = require('../validators/auth')
const { valiodationMiddleware } = require('../middlewares/validation-middleware')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

router.post('/employee/signup', userAuth,registerValidation, valiodationMiddleware,register)
router.post('/login', loginValidation, valiodationMiddleware, login)
router.get('/logout',userAuth,logout)
router.post('/signup', registerValidation, valiodationMiddleware,register_admins)

module.exports = router