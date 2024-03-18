const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const {  createProject, updateProject, deleteProject, findAvailableEmployees, findEmployees, getProjectTeamView, getProjectByManager } = require('../controllers/projects')
const { checkProjectManager } = require('../validators/roles')



router.post('/projects/create', userAuth, checkProjectManager,createProject)
router.put('/projects/:projectName/update', userAuth, checkProjectManager,updateProject);
router.delete('/projects/:projectName/delete', userAuth, checkProjectManager, deleteProject);
router.post('/findAvailableEmployees',userAuth, checkProjectManager,findAvailableEmployees);
router.post('/findEmployees',userAuth, checkProjectManager,findEmployees);
router.get('/getProjectTeamView/:projectId', userAuth, getProjectTeamView)
router.get('/projects/manager', userAuth,getProjectByManager);

module.exports = router