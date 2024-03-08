const db = require("../db");


exports.addSkillEndorsement = async (req, res) => {
    try {
      const { skillId, type, title, description, project_name } = req.body;
      const employeeId = req.user.id;
  
      const skillAssignmentCheckQuery = `
        SELECT 1
        FROM UserSkills
        WHERE skill_id = $1 AND user_id = $2;
      `;
      const skillAssignmentCheckResult = await db.query(skillAssignmentCheckQuery, [skillId, employeeId]);
  
      if (skillAssignmentCheckResult.rows.length === 0) {
        return res.status(403).json({
          error: "Access forbidden. You can only endorse skills you have assigned to your profile.",
        });
      }
  
      let addedEndorsement;
      if (type !== "Project") {
        const addEndorsementQuery = `
          INSERT INTO SkillEndorsements (user_id, skill_id, type, title, description)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const addEndorsementValues = [employeeId, skillId, type, title, description];
        addedEndorsement = await db.query(addEndorsementQuery, addEndorsementValues);
      } else {
        const projectIdQuery = `
          SELECT project_id
          FROM Projects
          WHERE project_name = $1;
        `;
        const projectIdResult = await db.query(projectIdQuery, [project_name]);
  
        if (projectIdResult.rows.length === 0) {
          return res.status(404).json({
            error: "Project not found.",
          });
        }
  
        const projectId = projectIdResult.rows[0].project_id;
  
        const projectAssignmentCheckQuery = `
          SELECT 1
          FROM ProjectTeam
          WHERE project_id = $1 AND user_id = $2;
        `;
        const projectAssignmentCheckResult = await db.query(projectAssignmentCheckQuery, [projectId, employeeId]);
  
        if (projectAssignmentCheckResult.rows.length === 0) {
          return res.status(403).json({
            error: "Access forbidden. You can only endorse projects you've been assigned to.",
          });
        }
  
        const addEndorsementQuery = `
          INSERT INTO SkillEndorsements (user_id, skill_id, type, project_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;
        const addEndorsementValues = [employeeId, skillId, type, projectId];
        addedEndorsement = await db.query(addEndorsementQuery, addEndorsementValues);
  
        // Obține informațiile despre proiect
        const projectInfoQuery = `
          SELECT *
          FROM Projects
          WHERE project_id = $1;
        `;
        const projectInfoResult = await db.query(projectInfoQuery, [projectId]);
        const projectInfo = projectInfoResult.rows[0];
  
        // Adaugă informațiile despre proiect la răspuns
        addedEndorsement.rows[0].project_info = projectInfo;
      }
  
      res.status(200).json({
        success: true,
        endorsement: addedEndorsement.rows[0],
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };
  


  exports.validateSkill = async (req, res) => {
    try {
      const departmentManager = req.user.role === 'Department Manager';
      const managerDepartmentId = req.user.department_id;
  
      if (!departmentManager) {
        return res.status(403).json({
          error: 'Access forbidden. Only Department Managers can validate skills.',
        });
      }
  
      const { skillName, employeeName } = req.params;
  
      const validateSkillQuery = `
        UPDATE UserSkills
        SET validated = true
        WHERE skill_id IN (
          SELECT skill_id
          FROM Skills
          WHERE skill_name = $1
            AND user_id IN (
              SELECT user_id
              FROM Users
              WHERE username = $2
                AND department_id = $3
            )
        )
        RETURNING *;
      `;
  
      const validatedSkillResult = await db.query(validateSkillQuery, [skillName, employeeName, managerDepartmentId]);
  
      if (validatedSkillResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Skill not found or already validated.',
        });
      }
  
      res.status(200).json({
        success: true,
        validatedSkill: validatedSkillResult.rows[0],
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
};

  
  
  
  
  