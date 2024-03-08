const db = require("../db");

exports.getSkillUpgradeProposals = async (req, res) => {
  try {
    const userId = req.user.id;

    const recentProjectsQuery = `
      SELECT DISTINCT P.project_id, P.project_name, P.status, PT.roles
      FROM ProjectTeam PT
      JOIN Projects P ON PT.project_id = P.project_id
      WHERE PT.user_id = $1
        AND P.start_date <= CURRENT_DATE - INTERVAL '3 months';
    `;

    const recentProjectsValues = [userId];
    const recentProjectsResult = await db.query(recentProjectsQuery, recentProjectsValues);
    const recentProjects = recentProjectsResult.rows;

    if (recentProjects.length === 0) {
      return res.status(404).json({
        error: "Nu s-au găsit proiecte recente pentru utilizatorul curent în ultimele 3 luni.",
      });
    }

    const skillRequirementsQuery = `
      SELECT PR.project_id, S.skill_id, S.skill_name, PR.min_level
      FROM ProjectSkillRequirements PR
      JOIN Skills S ON PR.skill_id = S.skill_id
      WHERE PR.project_id IN (${recentProjects.map((_, index) => `$${index + 1}`).join(", ")});
    `;

    const skillRequirementsValues = recentProjects.map((project) => project.project_id);
    const skillRequirementsResult = await db.query(skillRequirementsQuery, skillRequirementsValues);
    const skillRequirements = skillRequirementsResult.rows;

    if (skillRequirements.length === 0) {
      return res.status(404).json({
        error: "Nu s-au găsit cerințe de abilități pentru proiectele recente ale utilizatorului.",
      });
    }


    for (const requirement of skillRequirements) {
 
      const existingSkillQuery = `
        SELECT 1
        FROM UserSkills
        WHERE user_id = $1 AND skill_id = $2
      `;
      const existingSkillValues = [userId, requirement.skill_id];
      const existingSkillResult = await db.query(existingSkillQuery, existingSkillValues);

      if (existingSkillResult.rows.length === 0) {

        const addSkillProposalQuery = `
          INSERT INTO ProposedSkills (user_id, skill_id, level, experience)
          VALUES ($1, $2, $3, '0-6 months');
        `;

        const addSkillProposalValues = [
          userId,
          requirement.skill_id,
          requirement.min_level,
        ];
        await db.query(addSkillProposalQuery, addSkillProposalValues);
      }
    }

    const skillUpgradeProposals = [];
    for (const project of recentProjects) {
      for (const requirement of skillRequirements) {
        skillUpgradeProposals.push({
          project_name: project.project_name,
          status: project.status,
          role: project.roles,
          skill_id: requirement.skill_id,
          skill_name: requirement.skill_name,
          min_level: requirement.min_level,
        });
      }
    }

    res.status(200).json({
      success: true,
      skillUpgradeProposals,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.addSkillProposalToProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillName, level, experience } = req.body;

    const skillIdQuery = `
        SELECT skill_id FROM Skills
        WHERE skill_name = $1
      `;
    const skillIdValues = [skillName];
    const skillIdResult = await db.query(skillIdQuery, skillIdValues);

    if (skillIdResult.rows.length === 0) {
      return res.status(400).json({
        error: `Skill '${skillName}' not found.`,
      });
    }

    const skillId = skillIdResult.rows[0].skill_id;

    const addSkillProposalQuery = `
        INSERT INTO userSkills (user_id, skill_id, level, experience)
        VALUES ($1, $2, $3, $4)
      `;
    const addSkillProposalValues = [userId, skillId, level, experience];
    await db.query(addSkillProposalQuery, addSkillProposalValues);

    res.status(201).json({
      success: true,
      message: "Skill added to user profile successfully.",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
