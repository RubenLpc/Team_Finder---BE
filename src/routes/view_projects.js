const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { viewEmployeeProjects, viewDepartmentProjects, viewProjectDetails } = require('../controllers/view_projects');
const { checkDepartmentManager } = require('../validators/roles');

router.get('/employee/projects', userAuth, viewEmployeeProjects);
router.get('/department/projects', userAuth, checkDepartmentManager, viewDepartmentProjects);
router.get('/projectDetails/:projectName', userAuth,viewProjectDetails);

module.exports = router