const db = require('../db');

exports.assignSkillsToProject = async (req, res) => {
  try {
    const projectName = req.params.projectName; 
    const { skillName, minLevel } = req.body;

    const existingProject = await db.query('SELECT * FROM Projects WHERE project_name = $1', [projectName]); 

    if (existingProject.rows.length === 0) {
      return res.status(404).json({
        error: 'Project not found.',
      });
    }

    const skillDetails = await db.query('SELECT * FROM Skills WHERE skill_name = $1', [skillName]);

    if (skillDetails.rows.length === 0) {
      return res.status(400).json({
        error: `Skill '${skillName}' not found in the organization.`,
      });
    }

    const skillId = skillDetails.rows[0].skill_id;

    const validLevels = [1, 2, 3, 4, 5];
    if (!validLevels.includes(minLevel)) {
      return res.status(400).json({
        error: 'Invalid minLevel. Should be one of: 1 (Learns), 2 (Knows), 3 (Does), 4 (Helps), 5 (Teaches).',
      });
    }

    await db.query(
      'INSERT INTO ProjectSkillRequirements (project_id, skill_id, min_level) VALUES ($1, $2, $3)',
      [existingProject.rows[0].project_id, skillId, minLevel] 
    );

    res.status(201).json({
      success: true,
      message: 'Skill requirement assigned to project successfully.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
