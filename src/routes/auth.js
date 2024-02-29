const {Router} = require('express')
const { getUsers, register, login, protected, logout, register_admins } = require('../controllers/auth')
const { registerValidation, loginValidation } = require('../validators/auth')
const { valiodationMiddleware } = require('../middlewares/validation-middleware')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()
const path = require('path');
const { create_departament, assignManagerToDepartment, addEmployeeToDepartment, getDepartmentMembers } = require('../controllers/departaments')
const { getOrganizationMembers, assignEmployeeRole } = require('../controllers/organizator')
const { createSkill } = require('../controllers/skills')




router.get('/get-users',getUsers)
router.get('/protected', userAuth, protected) 
router.post('/employee/signup', registerValidation, valiodationMiddleware,register)
router.post('/login', loginValidation, valiodationMiddleware, login)
router.get('/logout',userAuth,logout)
router.post('/signup', registerValidation, valiodationMiddleware,register_admins)
router.post('/departments/create', userAuth,create_departament);
router.post('/departments/:departmentName/managers', assignManagerToDepartment);
router.post('/departments/addEmployee', userAuth,addEmployeeToDepartment);
router.get('/departments/:departmentName/members', getDepartmentMembers);
router.get('/organizator/members',userAuth, getOrganizationMembers );
router.post('/organizator/:employeeName/role',assignEmployeeRole)
router.post('/skill/create', userAuth, createSkill);




module.exports = router