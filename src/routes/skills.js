const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { createSkill, updateSkill, deleteSkill, getAllSkillsForOrganization, linkSkillToDepartment } = require('../controllers/skills');
const { checkDepartmentManager } = require('../validators/roles');

router.post('/skills/create', userAuth, checkDepartmentManager, createSkill);
router.put('/skills/update', userAuth, checkDepartmentManager,  updateSkill);
router.delete('/skills/:skillName/delete', userAuth, checkDepartmentManager, deleteSkill);
router.get('/skills/organization', userAuth, getAllSkillsForOrganization);
router.post('/skills/link-to-department',userAuth, checkDepartmentManager, linkSkillToDepartment);

module.exports = router