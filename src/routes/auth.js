const {Router} = require('express')
const { getUsers, register, login, protected, logout, register_admins } = require('../controllers/auth')
const { registerValidation, loginValidation } = require('../validators/auth')
const { valiodationMiddleware } = require('../middlewares/validation-middleware')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()
const path = require('path');
const { create_departament, assignManagerToDepartment, addEmployeeToDepartment, getDepartmentMembers, deleteDepartment } = require('../controllers/departaments')
const { getOrganizationMembers, assignEmployeeRole } = require('../controllers/organizator')
const { createSkill, updateSkill, deleteSkill, getAllSkillsForOrganization, linkSkillToDepartment } = require('../controllers/skills')
const { addSkillToUser, getUserSkills } = require('../controllers/user_skill')




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
router.post('/organizator/:employeeName/role',assignEmployeeRole)
router.delete('/departments/:departmentName/delete', userAuth, deleteDepartment)
router.post('/skills/create', userAuth, createSkill);
router.put('/skills/update', userAuth, updateSkill);
router.delete('/skills/:skillName/delete', userAuth, deleteSkill);
router.get('/skills/organization', userAuth, getAllSkillsForOrganization);
router.post('/skills/link-to-department',userAuth, linkSkillToDepartment);
router.post('/users/addskills', userAuth, addSkillToUser)
router.get('/users/getskills',userAuth, getUserSkills)


module.exports = router