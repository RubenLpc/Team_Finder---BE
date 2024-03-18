const {Router} = require('express')
const {userAuth} = require('../middlewares/auth-middleware')
const router = Router()

const { getOrganizationMembers, assignEmployeeRole, getOrganizationTeamRoles, createTeamRole, updateTeamRole, deleteTeamRole } = require('../controllers/organizator')
const { checkOrganizationAdmin } = require('../validators/roles')

router.get('/organizator/members',userAuth, getOrganizationMembers );
router.post('/organizator/:employeeName/assignRole',userAuth,  checkOrganizationAdmin ,assignEmployeeRole)

router.get('/organization/team-roles', userAuth, getOrganizationTeamRoles);
router.post('/organization/create/team-roles',userAuth, checkOrganizationAdmin, createTeamRole);
router.put('/organization/update/team-roles/:role_name',userAuth, checkOrganizationAdmin, updateTeamRole);
router.delete('/organization/delete/team-roles/:role_name',userAuth, checkOrganizationAdmin, deleteTeamRole);
  

module.exports = router