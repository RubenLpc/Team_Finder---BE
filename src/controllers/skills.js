const { use } = require("passport");
const db = require("../db");

exports.createSkill = async (req, res) => {
  try {
    const { category_name, skill_name, description } = req.body;
    const author_id = req.user.id;

    const departmentNames = req.body.departments.split(',').map(department => department.trim());
    
    for (const departmentName of departmentNames) {
      const department = await db.query(
        "SELECT * FROM departments WHERE department_name = $1 AND department_manager_id = $2",
        [departmentName, req.user.id]
      );

      if (department.rows.length === 0) {
        return res.status(400).json({ error: `Invalid department: ${departmentName}` });
      }
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
      "INSERT INTO skills (category_id, skill_name, description, author_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [category_id, skill_name, description, author_id]
    );

    const skill_id = result.rows[0].skill_id;

    for (const departmentName of departmentNames) {
      const department = await db.query(
        "SELECT * FROM departments WHERE department_name = $1 AND department_manager_id = $2",
        [departmentName, req.user.id]
      );

      if (department.rows.length > 0) {
        await db.query(
          "INSERT INTO SkillDepartments (skill_id, department_id) VALUES ($1, $2)",
          [skill_id, department.rows[0].department_id]
        );
      } 
    }

    const user = req.user.username;

    // Fetching departments where skill is used
    const departmentsResult = await db.query(
      `SELECT departments.department_name
       FROM departments
       JOIN SkillDepartments ON departments.department_id = SkillDepartments.department_id
       WHERE SkillDepartments.skill_id = $1`,
      [skill_id]
    );

    // Extracting department names into a comma-separated string
    const departmentsUsed = departmentsResult.rows.map(department => department.department_name).join(', ');

    res.status(201).json({
      success: true,
      skill: {
        details: result.rows[0],
        skill_name: skill_name,
        description: description,
        category : category_name,
        author: user,
        department: departmentsUsed
      }
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

    if (newDepartment) {
      const isDepartmentManager = await db.query(
        "SELECT * FROM departments WHERE department_manager_id = $1 AND department_name = $2",
        [author_id, newDepartment]
      );

      if (isDepartmentManager.rows.length === 0) {
        return res.status(403).json({
          error: "Access forbidden. You are not the manager of the specified department.",
        });
      }
    }

    const existingSkill = await db.query(
      "SELECT * FROM skills WHERE skill_name = $1 AND author_id = $2",
      [currentSkillName, author_id]
    );

    if (existingSkill.rows.length === 0) {
      return res.status(404).json({
        error: "Skill not found or you do not have permission to update it.",
      });
    }

    if (newDepartment) {
      const department = await db.query(
        "SELECT * FROM departments WHERE department_name = $1 AND department_manager_id = $2",
        [newDepartment, author_id]
      );

      if (department.rows.length === 0) {
        return res.status(403).json({
          error: "Access forbidden. You are not the manager of the specified department.",
        });
      }

      const existingSkillDepartment = await db.query(
        "SELECT * FROM SkillDepartments WHERE skill_id = $1 AND department_id = $2",
        [existingSkill.rows[0].skill_id, department.rows[0].department_id]
      );

      if (existingSkillDepartment.rows.length === 0) {
        await db.query(
          "INSERT INTO SkillDepartments (skill_id, department_id) VALUES ($1, $2)",
          [existingSkill.rows[0].skill_id, department.rows[0].department_id]
        );
      }
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

    const result = await db.query(
      "UPDATE skills SET skill_name = $1, description = $2, category_id = $3 WHERE skill_name = $4 AND author_id = $5 RETURNING *",
      [
        newSkillName || currentSkillName,
        description || existingSkill.rows[0].description,
        categoryId,
        currentSkillName,
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

exports.deleteSkill = async (req, res) => {
  try {
    const { skillName } = req.params;
    const author_id = req.user.id;

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
      "DELETE FROM SkillDepartments WHERE skill_id = $1",
      [existingSkill.rows[0].skill_id]
    );

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
      `SELECT 
         s.skill_id,
         s.skill_name,
         s.description,
         sc.category_name AS category,
         d.department_name AS department,
         u.username AS author
       FROM 
         Skills s
       JOIN 
         SkillCategories sc ON s.category_id = sc.category_id
       JOIN 
         Users u ON s.author_id = u.user_id
       LEFT JOIN 
         SkillDepartments sd ON s.skill_id = sd.skill_id
       LEFT JOIN 
         Departments d ON sd.department_id = d.department_id
       WHERE 
         u.organization_id = $1`,
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

    const existingSkill = await db.query(
      "SELECT * FROM skills WHERE skill_name = $1",
      [skillName]
    );

    if (existingSkill.rows.length === 0) {
      return res.status(404).json({ error: "Skill not found." });
    }

    const departmentId = req.user.department_id;

    await db.query(
      "INSERT INTO SkillDepartments (skill_id, department_id) VALUES ($1, $2)",
      [existingSkill.rows[0].skill_id, departmentId]
    );

    res.status(200).json({
      success: true,
      message: "Skill linked to department successfully.",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
