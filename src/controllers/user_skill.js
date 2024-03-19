const db = require('../db')

exports.addSkillToUser = async (req, res) => {
  try {
    const { skillName, level, experience } = req.body;
    const userId = req.user.id;
  
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return res.status(400).json({
        error: 'Invalid level. Must be an integer between 1 and 5.',
      });
    }
  
    const validExperienceValues = ['0-6 months', '6-12 months', '1-2 years', '2-4 years', '4-7 years', '>7 years'];
    if (!validExperienceValues.includes(experience)) {
      return res.status(400).json({
        error: 'Invalid experience. Must be one of: 0-6 months, 6-12 months, 1-2 years, 2-4 years, 4-7 years, >7 years.',
      });
    }
  
    const skillDetails = await db.query(
      'SELECT * FROM skills WHERE skill_name = $1',
      [skillName]
    );
  
    if (skillDetails.rows.length === 0) {
      return res.status(404).json({
        error: 'Skill not found.',
      });
    }
  
    const skillId = skillDetails.rows[0].skill_id;
  
    const existingSkill = await db.query(
      'SELECT * FROM userskills WHERE user_id = $1 AND skill_id = $2',
      [userId, skillId]
    );
  
    if (existingSkill.rows.length > 0) {
      return res.status(409).json({
        error: 'User already possesses this skill.',
      });
    }
  
    const result = await db.query(
      'INSERT INTO userskills (user_id, skill_id, level, experience) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, skillId, level, experience]
    );
  
    const userNameQuery = 'SELECT username FROM users WHERE user_id = $1';
    const userNameResult = await db.query(userNameQuery, [userId]);
    const userName = userNameResult.rows[0].username;
  
    const departmentQuery = `
      SELECT departments.department_name, users.username
      FROM departments
      JOIN users ON departments.department_manager_id = users.user_id
      WHERE departments.department_id = $1
    `;
    const departmentResult = await db.query(departmentQuery, [req.user.department_id]);
    const departmentName = departmentResult.rows[0].department_name;
    const managerName = departmentResult.rows[0].username;
  
    const departmentManagerQuery = `
  SELECT department_manager_id FROM departments WHERE department_id = $1
`;
const departmentManagerResult = await db.query(departmentManagerQuery, [req.user.department_id]);
const departmentManagerId = departmentManagerResult.rows[0].department_manager_id;

const notificationMessage = `${userName} has added a new skill that requires validation in the ${departmentName} department.`;

const notificationQuery = `
  INSERT INTO notifications (user_id, message, type)
  VALUES ($1, $2, 'skill_validation')
`;
const notificationValues = [departmentManagerId, notificationMessage];
await db.query(notificationQuery, notificationValues);

res.status(201).json({
  success: true,
  message: 'Skill assigned successfully. Manager notified for validation.',
  name: userName,
  skill: skillName,
  department: departmentName,
  managerName: managerName,
  experience: experience,
  level: level
});

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
  
};





exports.getUserSkills = async (req, res) => {
  try {
      const userId = req.user.id;

      const userSkillsQuery = await db.query(
          'SELECT skill_id, level, experience FROM userskills WHERE user_id = $1',
          [userId]
      );

      const skills = [];
      const userDepartmentId = req.user.department_id;

      // Obține numele departamentului asociat userDepartmentId
      const departmentQuery = await db.query(
          'SELECT department_name FROM departments WHERE department_id = $1',
          [userDepartmentId]
      );

      const departmentName = departmentQuery.rows.length > 0 ? departmentQuery.rows[0].department_name : null;

      for (const userSkill of userSkillsQuery.rows) {
          const skillDetails = await db.query(
              'SELECT skill_name FROM skills WHERE skill_id = $1',
              [userSkill.skill_id]
          );

          if (skillDetails.rows.length > 0) {
              skills.push({
                  skill_name: skillDetails.rows[0].skill_name,
                  level: userSkill.level,
                  experience: userSkill.experience,
              });
          }
      }

      res.status(200).json({
          success: true,
          skills: skills,
          department: departmentName,
          name: req.user.username
      });
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
  }
};


exports.getUserSkillsByUsername = async (req, res) => {
  try {
      const { username } = req.params; // Obține numele utilizatorului din parametrii rutei

      const userQuery = await db.query(
          'SELECT user_id, department_id FROM users WHERE username = $1',
          [username]
      );

      if (userQuery.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      const { user_id: userId, department_id: userDepartmentId } = userQuery.rows[0];

      const userSkillsQuery = await db.query(
          'SELECT skill_id, level, experience FROM userskills WHERE user_id = $1',
          [userId]
      );

      const skills = [];
      
      // Obține numele departamentului asociat userDepartmentId
      const departmentQuery = await db.query(
          'SELECT department_name FROM departments WHERE department_id = $1',
          [userDepartmentId]
      );

      const departmentName = departmentQuery.rows.length > 0 ? departmentQuery.rows[0].department_name : null;

      for (const userSkill of userSkillsQuery.rows) {
          const skillDetails = await db.query(
              'SELECT skill_name FROM skills WHERE skill_id = $1',
              [userSkill.skill_id]
          );

          if (skillDetails.rows.length > 0) {
              skills.push({
                  skill_name: skillDetails.rows[0].skill_name,
                  level: userSkill.level,
                  experience: userSkill.experience,
              });
          }
      }

      res.status(200).json({
          success: true,
          skills: skills,
          department_name: departmentName,
          user: { username: username, department_id: userDepartmentId }
      });
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
  }
};
