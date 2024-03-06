const {Router} = require('express')
const { getUsers, register, login, protected, logout, register_admins } = require('../controllers/auth')
const { registerValidation, loginValidation } = require('../validators/auth')
const { valiodationMiddleware } = require('../middlewares/validation-middleware')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()
const { create_departament, assignManagerToDepartment, addEmployeeToDepartment, getDepartmentMembers, deleteDepartment } = require('../controllers/departaments')
const { getOrganizationMembers, assignEmployeeRole } = require('../controllers/organizator')
const { createSkill, updateSkill, deleteSkill, getAllSkillsForOrganization, linkSkillToDepartment } = require('../controllers/skills')
const { addSkillToUser, getUserSkills } = require('../controllers/user_skill')
const {  createProject, updateProject, deleteProject, findAvailableEmployees, findEmployees } = require('../controllers/projects')
const { proposeDeallocation, proposeAssignment, getEmployeeProposals, processProposal } = require('../controllers/proposals')
const { viewEmployeeProjects, viewDepartmentProjects, viewProjectDetails } = require('../controllers/view_projects')
const { addSkillEndorsement, validateSkill } = require('../controllers/endorsements')
const { findExperts } = require('../controllers/openaiService')
const { getUserNotifications } = require('../controllers/notifications')
const { getSkillStatistics } = require('../controllers/skill_statistics')
const { assignSkillsToProject } = require('../controllers/projectController')
const { getSkillUpgradeProposals } = require('../controllers/skillProposal')




router.get('/get-users',getUsers)
router.get('/protected', userAuth, protected) 
router.post('/employee/signup', userAuth,registerValidation, valiodationMiddleware,register)
router.post('/login', loginValidation, valiodationMiddleware, login)
router.get('/logout',userAuth,logout)
router.post('/signup', registerValidation, valiodationMiddleware,register_admins)
router.post('/departments/create', userAuth,create_departament);
router.post('/departments/:departmentName/managers',userAuth, assignManagerToDepartment);
router.post('/departments/addEmployee', userAuth,addEmployeeToDepartment);
router.get('/departments/:departmentName/members', getDepartmentMembers);
router.get('/organizator/members',userAuth, getOrganizationMembers );
router.post('/organizator/:employeeName/assignRole',userAuth,assignEmployeeRole)
router.delete('/departments/:departmentName/delete', userAuth, deleteDepartment)
router.post('/skills/create', userAuth, createSkill);
router.put('/skills/update', userAuth, updateSkill);
router.delete('/skills/:skillName/delete', userAuth, deleteSkill);
router.get('/skills/organization', userAuth, getAllSkillsForOrganization);
router.post('/skills/link-to-department',userAuth, linkSkillToDepartment);
router.post('/users/addskills', userAuth, addSkillToUser)
router.get('/users/getskills',userAuth, getUserSkills)
router.post('/projects/create', userAuth,createProject)
router.put('/projects/:projectName/update', userAuth, updateProject);
router.delete('/projects/:projectName/delete', userAuth, deleteProject);
router.post('/findAvailableEmployees',userAuth, findAvailableEmployees);
router.post('/findEmployees',userAuth, findEmployees);
router.post('/:projectId/propose-assignment', userAuth,proposeAssignment);
router.post('/:projectId/propose-deallocation', userAuth,proposeDeallocation);
router.get('/getProposals',userAuth, getEmployeeProposals)
router.post('/processProposal', userAuth,processProposal)
router.get('/employee/projects', userAuth, viewEmployeeProjects);
router.get('/department/projects', userAuth, viewDepartmentProjects);
router.get('/projectDetails/:projectName', userAuth,viewProjectDetails);
router.post('/skills/endorsements', userAuth,addSkillEndorsement);
router.put('/validate-skill/:employeeName/:skillName', userAuth, validateSkill);
router.post('/find-experts',userAuth, findExperts);
router.get('/getNotifications',userAuth, getUserNotifications)
router.get('/getSkillStatistics',userAuth, getSkillStatistics)
router.post('/assignSkillsToProject/:projectName',userAuth, assignSkillsToProject)
router.get('/getSkillUpgradeProposals',userAuth, getSkillUpgradeProposals)



module.exports = router