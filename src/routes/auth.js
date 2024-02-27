const {Router} = require('express')
const { getUsers, register, login, protected, logout, register_admins } = require('../controllers/auth')
const { registerValidation, loginValidation } = require('../validators/auth')
const { valiodationMiddleware } = require('../middlewares/validation-middleware')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()
const path = require('path');
const baseDir = path.dirname(require.main.filename);

router.get('/', (req, res) => {
    res.sendFile(path.join(baseDir, 'public', 'index.html'));
});


router.get('/get-users',getUsers)
router.get('/protected', userAuth, protected) 
router.post('/employee/signup', registerValidation, valiodationMiddleware,register)
router.post('/login', loginValidation, valiodationMiddleware, login)
router.get('/logout',userAuth,logout)
router.post('/signup', registerValidation, valiodationMiddleware,register_admins)



module.exports = router