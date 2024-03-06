const db = require("../db");

exports.getSkillUpgradeProposals = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Obține proiectele la care a participat utilizatorul în ultimele 3 luni
      const recentProjectsQuery = `
          SELECT DISTINCT P.project_id, P.project_name, P.status, PT.roles
          FROM ProjectTeam PT
          JOIN Projects P ON PT.project_id = P.project_id
          WHERE PT.user_id = $1
            AND P.start_date >= CURRENT_DATE - INTERVAL '3 months';
        `;
      const recentProjectsValues = [userId];
      const recentProjectsResult = await db.query(
        recentProjectsQuery,
        recentProjectsValues
      );
      const recentProjects = recentProjectsResult.rows;
  
      // Obține cerințele de abilități pentru fiecare proiect recent
      const skillRequirementsQuery = `
        SELECT PR.project_id, S.skill_id, S.skill_name, PR.min_level
        FROM ProjectSkillRequirements PR
        JOIN Skills S ON PR.skill_id = S.skill_id
        WHERE PR.project_id IN (${recentProjects.map((_, index) => `$${index + 1}`).join(', ')});
      `;
  
      const skillRequirementsValues = recentProjects.map(project => project.project_id);
      const skillRequirementsResult = await db.query(skillRequirementsQuery, skillRequirementsValues);
      const skillRequirements = skillRequirementsResult.rows;
  
      // Adaugă în tabela ProposedSkills skill-urile propuse
      for (const requirement of skillRequirements) {
        // Verifică dacă utilizatorul are deja acest skill în tabela UserSkills
        const existingSkillQuery = `
          SELECT 1
          FROM UserSkills
          WHERE user_id = $1 AND skill_id = $2
        `;
        const existingSkillValues = [userId, requirement.skill_id];
        const existingSkillResult = await db.query(existingSkillQuery, existingSkillValues);
        console.log(userId)
  
        if (existingSkillResult.rows.length === 0) {
          // Dacă skill-ul nu există deja în UserSkills, adaugă o propunere în ProposedSkills
          const addSkillProposalQuery = `
            INSERT INTO ProposedSkills (user_id, skill_id, level, experience)
            VALUES ($1, $2, $3, (SELECT experience FROM UserSkills WHERE user_id = $1 AND skill_id = $2));
          `;
          const addSkillProposalValues = [userId, requirement.skill_id, requirement.min_level];
          await db.query(addSkillProposalQuery, addSkillProposalValues);
        }
      }
  
      // Construiește o listă de propuneri de actualizare a abilităților bazate pe cerințele proiectelor recente
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

    const proposedSkillQuery = `
        SELECT * FROM ProposedSkills
        WHERE user_id = $1 AND skill_id = $2 AND level = $3
      `;
    const proposedSkillValues = [userId, skillId, level];
    const proposedSkillResult = await db.query(
      proposedSkillQuery,
      proposedSkillValues
    );

    if (proposedSkillResult.rows.length > 0) {
      return res.status(400).json({
        error: "Skill proposal already exists for the user.",
      });
    }

    const addSkillProposalQuery = `
        INSERT INTO userSkills (user_id, skill_id, level, experience)
        VALUES ($1, $2, $3, $4)
      `;
    const addSkillProposalValues = [userId, skillId, level, experience];
    await db.query(addSkillProposalQuery, addSkillProposalValues);

    res.status(201).json({
      success: true,
      message: "Skill proposal added to user profile successfully.",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
