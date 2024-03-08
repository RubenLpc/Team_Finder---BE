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

    const managerIdQuery = 'SELECT department_manager_id FROM departments WHERE department_id = $1';
    const departmentIdResult = await db.query(managerIdQuery, [req.user.department_id]);
    const managerId = departmentIdResult.rows[0].department_manager_id;

    const notificationMessage = `${userName} has added a new skill that requires validation.`;

    const notificationQuery = `
      INSERT INTO notifications (user_id, message, type)
      VALUES ($1, $2, 'skill_validation')
    `;
    const notificationValues = [managerId, notificationMessage];
    await db.query(notificationQuery, notificationValues);

    res.status(201).json({
      success: true,
      message: 'Skill assigned successfully. Manager notified for validation.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};





exports.getUserSkills = async (req, res) => {
    try {
      const userId = req.user.id;
  
      const userSkills = await db.query(
        'SELECT skill_id, level, experience FROM userskills WHERE user_id = $1',
        [userId]
      );
  
      const skills = [];
  
      for (const userSkill of userSkills.rows) {
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
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };
  