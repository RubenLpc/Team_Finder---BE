const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { create_departament, assignManagerToDepartment, addEmployeeToDepartment, getDepartmentMembers, deleteDepartment } = require('../controllers/departaments');
const { checkOrganizationAdmin, checkDepartmentManager } = require('../validators/roles');



router.post('/departments/create', userAuth,checkOrganizationAdmin,create_departament);
router.post('/departments/:departmentName/managers',userAuth,checkOrganizationAdmin, assignManagerToDepartment);
router.post('/departments/addEmployee', userAuth,checkDepartmentManager,addEmployeeToDepartment);
router.get('/departments/:departmentName/members',userAuth, getDepartmentMembers);
router.delete('/departments/:departmentName/delete', userAuth, deleteDepartment)

module.exports = router