const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { proposeDeallocation, proposeAssignment, getEmployeeProposals, processProposal } = require('../controllers/proposals');
const { checkProjectManager, checkDepartmentManager } = require('../validators/roles');

router.post('/:projectId/propose-assignment', userAuth,checkProjectManager,proposeAssignment);
router.post('/:projectId/propose-deallocation', userAuth,checkProjectManager,proposeDeallocation);
router.get('/getProposals',userAuth,checkDepartmentManager, getEmployeeProposals)
router.post('/processProposal', userAuth, checkDepartmentManager, processProposal)

module.exports = router