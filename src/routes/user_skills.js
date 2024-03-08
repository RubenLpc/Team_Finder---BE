const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { addSkillToUser, getUserSkills } = require('../controllers/user_skill')

router.post('/users/addskills', userAuth, addSkillToUser)
router.get('/users/getskills',userAuth, getUserSkills)

module.exports = router