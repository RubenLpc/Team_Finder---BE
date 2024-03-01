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

    res.status(201).json({
      success: true,
      message: 'Skill assigned successfully.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


// GET /api/users/skills - Obține lista cu toate abilitățile ale utilizatorului
exports.getUserSkills = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Obține lista cu toate abilitățile utilizatorului din tabela userskills
      const userSkills = await db.query(
        'SELECT skill_id, level, experience FROM userskills WHERE user_id = $1',
        [userId]
      );
  
      const skills = [];
  
      // Pentru fiecare abilitate, obține detaliile din tabela skills
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
  