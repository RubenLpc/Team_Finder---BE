const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { addSkillToUser, getUserSkills, getUserSkillsByUsername } = require('../controllers/user_skill')

router.post('/users/addskills', userAuth, addSkillToUser)
router.get('/users/getskills',userAuth, getUserSkills)
router.get('/users/:username/getskills',userAuth, getUserSkillsByUsername)


module.exports = router