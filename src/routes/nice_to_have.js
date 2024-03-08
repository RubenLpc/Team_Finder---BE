const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { addSkillEndorsement, validateSkill } = require('../controllers/endorsements')
const { getUserNotifications } = require('../controllers/notifications')
const { findExperts } = require('../controllers/openaiService')
const { getSkillStatistics } = require('../controllers/skill_statistics')
const { assignSkillsToProject } = require('../controllers/projectController')
const { getSkillUpgradeProposals, addSkillProposalToProfile } = require('../controllers/skillProposal')
const { checkProjectManager } = require('../validators/roles')


router.get('/getSkillStatistics',userAuth, getSkillStatistics)
router.post('/assignSkillsToProject/:projectName',userAuth, assignSkillsToProject)
router.get('/getSkillUpgradeProposals',userAuth, getSkillUpgradeProposals)
router.post('/addSkillProposalToProfile',userAuth, addSkillProposalToProfile)

router.post('/skills/addEndorsements', userAuth,addSkillEndorsement);
router.put('/validate-skill/:employeeName/:skillName', userAuth, validateSkill);

router.post('/find-experts',userAuth, checkProjectManager, findExperts);

router.get('/getNotifications',userAuth, getUserNotifications)


module.exports = router