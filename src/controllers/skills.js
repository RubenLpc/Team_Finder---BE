const db = require("../db");

exports.createSkill = async (req, res) => {
  try {
    const { category_name, skill_name, description, departments } = req.body;
    const author_id = req.user.id;

    if (req.user.role !== "Department Manager") {
      return res.status(403).json({
        error: "Access forbidden. Only Department Managers can create skills.",
      });
    }

    const existingSkill = await db.query(
      "SELECT * FROM skills WHERE skill_name = $1",
      [skill_name]
    );

    if (existingSkill.rows.length > 0) {
      return res.status(400).json({ error: "Skill already exists" });
    }

    let category_id;

    const existingCategory = await db.query(
      "SELECT * FROM skillcategories WHERE category_name = $1",
      [category_name]
    );

    if (existingCategory.rows.length === 0) {
      const result = await db.query(
        "INSERT INTO skillcategories (category_name, manager_id) VALUES ($1, $2) RETURNING *",
        [category_name, author_id]
      );

      category_id = result.rows[0].category_id;
    } else {
      category_id = existingCategory.rows[0].category_id;
    }

    const result = await db.query(
      "INSERT INTO skills (category_id, skill_name, description, author_id, departments) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [category_id, skill_name, description, author_id, departments]
    );

    res.status(201).json({
      success: true,
      skill: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
exports.updateSkill = async (req, res) => {
  try {
    const {
      currentSkillName,
      newSkillName,
      newCategoryName,
      description,
      newDepartment,
    } = req.body;
    const author_id = req.user.id;

    if (req.user.role !== "Department Manager") {
      return res.status(403).json({
        error: "Access forbidden. Only Department Managers can update skills.",
      });
    }

    // Verifică dacă abilitatea există și a fost creată de către utilizatorul curent
    const existingSkill = await db.query(
      "SELECT * FROM skills WHERE skill_name = $1 AND author_id = $2",
      [currentSkillName, author_id]
    );

    if (existingSkill.rows.length === 0) {
      return res.status(404).json({
        error: "Skill not found or you do not have permission to update it.",
      });
    }

    let categoryId = existingSkill.rows[0].category_id;
    if (newCategoryName) {
      const existingCategory = await db.query(
        "SELECT * FROM skillcategories WHERE category_name = $1 AND manager_id = $2",
        [newCategoryName, author_id]
      );

      if (existingCategory.rows.length === 0) {
        const result = await db.query(
          "INSERT INTO skillcategories (category_name, manager_id) VALUES ($1, $2) RETURNING *",
          [newCategoryName, author_id]
        );

        categoryId = result.rows[0].category_id;
      } else {
        categoryId = existingCategory.rows[0].category_id;
      }
    }
    let result, skill;
    // Verifică dacă utilizatorul este manager al noului departament
    let currentDepartments = existingSkill.rows[0].departments || "";
    if (newDepartment) {
      const isDepartmentManager = await db.query(
        "SELECT * FROM users WHERE user_id = $1 AND department_id = (SELECT department_id FROM skills WHERE skill_name = $2)",
        [author_id, currentSkillName]
      );

      if (isDepartmentManager.rows.length === 0) {
        const result = await db.query(
          "UPDATE skills SET skill_name = $1, description = $2, category_id = $3 WHERE skill_name = $4 AND author_id = $5 RETURNING *",
          [newSkillName, description, categoryId, currentSkillName, author_id]
        );
        skill = result;
      } else {
        // Dacă utilizatorul este manager al noului departament, adaugă-l la lista de departamente
        currentDepartments += (currentDepartments ? " " : "") + newDepartment;
        const result = await db.query(
          "UPDATE skills SET skill_name = $1, description = $2, category_id = $3, departments = $4 WHERE skill_name = $5 AND author_id = $6 RETURNING *",
          [
            newSkillName,
            description,
            categoryId,
            currentDepartments,
            currentSkillName,
            author_id,
          ]
        );
        skill = result;
      }
    }

    res.status(200).json({
      success: true,
      skill: skill.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const { skillName } = req.params;
    const author_id = req.user.id;

    if (req.user.role !== "Department Manager") {
      return res.status(403).json({
        error: "Access forbidden. Only Department Managers can delete skills.",
      });
    }

    const existingSkill = await db.query(
      "SELECT * FROM skills WHERE skill_name = $1 AND author_id = $2",
      [skillName, author_id]
    );

    if (existingSkill.rows.length === 0) {
      return res.status(404).json({
        error: "Skill not found or you do not have permission to delete it.",
      });
    }

    await db.query(
      "DELETE FROM skills WHERE skill_name = $1 AND author_id = $2",
      [skillName, author_id]
    );

    res.status(200).json({ success: true, message: "Skill deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllSkillsForOrganization = async (req, res) => {
  try {
    const organizationSkills = await db.query(
      `SELECT * FROM skills WHERE author_id IN (SELECT user_id FROM users WHERE organization_id = $1 )`,
      [req.user.organization_id]
    );

    res.status(200).json({
      success: true,
      skills: organizationSkills.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.linkSkillToDepartment = async (req, res) => {
  try {
    const { skillName } = req.body;
    const author_id = req.user.id;

    if (req.user.role !== "Department Manager") {
      return res
        .status(403)
        .json({
          error:
            "Access forbidden. Only Department Managers can link skills to departments.",
        });
    }

    const existingSkill = await db.query(
      "SELECT * FROM skills WHERE skill_name = $1 ",
      [skillName]
    );

    if (existingSkill.rows.length === 0) {
      return res.status(404).json({ error: "Skill not found." });
    }

    const departmentResult = await db.query(
      "SELECT department_name FROM departments WHERE department_id = $1",
      [req.user.department_id]
    );
    const departmentName = departmentResult.rows[0].department_name;

    const result = await db.query(
      "INSERT INTO skills (skill_name, category_id, description, departments, author_id) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [
        skillName,
        existingSkill.rows[0].category_id,
        existingSkill.rows[0].description,
        departmentName,
        author_id,
      ]
    );

    res.status(200).json({
      success: true,
      skill: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
