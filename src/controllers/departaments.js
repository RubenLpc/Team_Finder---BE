const db = require("../db");

exports.create_departament = async (req, res) => {
  try {
    const { department_name } = req.body;

    const result = await db.query(
      "INSERT INTO departments (department_name, organization_id) VALUES ($1, $2) RETURNING *",
      [department_name, req.user.organization_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};



exports.assignManagerToDepartment = async (req, res) => {
  try {
    const { manager_name } = req.body;
    const { departmentName } = req.params;

    const managerCheck = await db.query(
      "SELECT * FROM users WHERE username = $1 AND role = 'Department Manager'",
      [manager_name]
    );


    if (managerCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Employee not found or not eligible to be a manager" });
    }
    if(managerCheck.rows[0].organization_id !== req.user.organization_id){
      return res
      .status(404)
      .json({ error: "Department Manager not found in this organization" });
    }


    const managerId = managerCheck.rows[0].user_id;

    const departmentCheck = await db.query(
      "SELECT * FROM departments WHERE department_name = $1",
      [departmentName]
    );

    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    if (departmentCheck.rows[0].department_manager_id) {
      return res.status(400).json({
        error: "The department already has a manager assigned",
      });
    }

    const existingManagerAssignment = await db.query(
      "SELECT * FROM departments WHERE department_manager_id = $1",
      [managerId]
    );

    if (existingManagerAssignment.rows.length > 0) {
      return res.status(400).json({
        error: "The manager is already assigned to another department",
      });
    }

    const result = await db.query(
      "UPDATE departments SET department_manager_id = $1 WHERE department_name = $2 RETURNING *",
      [managerId, departmentName]
    );

    await db.query(
      "UPDATE users SET role = 'Department Manager' WHERE user_id = $1",
      [managerId]
    );

    await db.query(
      "UPDATE users SET department_id = $1 WHERE user_id = $2",
      [departmentCheck.rows[0].department_id,managerId]
    );

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.addEmployeeToDepartment = async (req, res) => {
  try {
    const { employeeName } = req.body;
    
    let departmentId = req.user.department_id;

    const employeeCheck = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [employeeName]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (req.user.organization_id !== employeeCheck.rows[0].organization_id) {
      return res.status(403).json({
        error: "Access forbidden. You are not a Department Manager for this organization.",
      });
    }

    const existingAssignment = await db.query(
      "SELECT * FROM users WHERE username = $1 AND department_id IS NOT NULL",
      [employeeName]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        error: "The employee is already assigned to another department",
      });
    }

    const employeeRole = employeeCheck.rows[0].role;

    if (!(employeeRole === "Employee")) {
      return res.status(403).json({
        error:
          "The employee does not have the appropriate role to be assigned to a department",
      });
    }

    console.log(departmentId)
    const result = await db.query(
      "UPDATE users SET department_id = $1 WHERE username = $2 RETURNING *",
      [departmentId, employeeName]
    );
    

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.removeEmployeeFromDepartment = async (req, res) => {
  try {
    const { employeeName } = req.body;
    const departmentId = req.user.department_id;

    const employeeCheck = await db.query(
      "SELECT * FROM users WHERE username = $1 AND department_id = $2",
      [employeeName, departmentId]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found in this department" });
    }

    const result = await db.query(
      "UPDATE users SET department_id = NULL WHERE username = $1 RETURNING *",
      [employeeName]
    );

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.getDepartmentSkills = async (req, res) => {
  try {
    const { departmentName } = req.params;
    const departmentCheck = await db.query(
      "SELECT * FROM departments WHERE department_name = $1",
      [departmentName]
    );
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }
    const departmentId = departmentCheck.rows[0].department_id;
    const result = await db.query(`
      SELECT s.skill_name
      FROM users u
      JOIN userskills us ON u.user_id = us.user_id
      JOIN skills s ON us.skill_id = s.skill_id
      WHERE u.department_id = $1
      GROUP BY s.skill_name;`,
      [departmentId]
    );

    const departmentSkills = result.rows.map(row => row.skill_name);

    res.status(200).json({
      success: true,
      departmentSkills: departmentSkills,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.getDepartmentMembers = async (req, res) => {
  try {
    const { departmentName } = req.params;
    const departmentCheck = await db.query(
      "SELECT * FROM departments WHERE department_name = $1",
      [departmentName]
    );
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }
    const departmentId = departmentCheck.rows[0].department_id;
    const result = await db.query(`
      SELECT u.*, STRING_AGG(s.skill_name, ', ') AS skill_names
      FROM users u
      LEFT JOIN userskills us ON u.user_id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.skill_id
      WHERE u.department_id = $1
      GROUP BY u.user_id;`,
      [departmentId]
    );

    // Modificăm structura datelor pentru a avea o cheie "skill_names" care să conțină skill-urile separate prin virgulă
    const departmentMembers = result.rows.map(member => ({
      ...member,
      skill_names: member.skill_names || null // Setăm skill_names la null dacă este null
    }));

    res.status(200).json({
      success: true,
      users: departmentMembers,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};



exports.getOrganizationDepartments = async (req, res) => {
  try {
    const { organization_id } = req.user;

    const result = await db.query(
      "SELECT department_name FROM departments WHERE organization_id = $1",
      [organization_id]
    );

    res.status(200).json({
      success: true,
      departments: result.rows.map(row => row.department_name),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};



exports.getUsersWithoutDepartment = async (req, res) => {
  try {
    // Extragem organizația utilizatorului autentificat din token
    const userOrganizationId = req.user.organization_id;

    const result = await db.query(`
      SELECT u.*, STRING_AGG(s.skill_name, ', ') AS skill_names
      FROM users u
      LEFT JOIN userskills us ON u.user_id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.skill_id
      WHERE u.department_id IS NULL
      AND u.organization_id = $1
      GROUP BY u.user_id;`,
      [userOrganizationId]
    );

    // Modificăm structura datelor pentru a avea o cheie "skill_names" care să conțină skill-urile separate prin virgulă
    const usersWithSkills = result.rows.map(user => ({
      ...user,
      skill_names: user.skill_names || null // Setăm skill_names la un șir gol dacă este null
    }));

    res.status(200).json({
      success: true,
      users: usersWithSkills,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};








exports.deleteDepartment = async (req, res) => {
  try {
    const { departmentName } = req.params;

    const isOrgAdmin = req.user.role === "Organization Admin";
    const isDeptManager = req.user.role === "Department Manager";

    if (!isOrgAdmin && !isDeptManager) {
      return res.status(403).json({
        error:
          "Access forbidden. Only Organization Admins or Department Managers can perform this action.",
      });
    }

    const existingDepartment = await db.query(
      "SELECT * FROM departments WHERE department_name = $1",
      [departmentName]
    );

    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    const departmentId = existingDepartment.rows[0].department_id;
    const memberIds = await db.query(
      "SELECT user_id FROM users WHERE department_id = $1",
      [departmentId]
    );

    await db.query("DELETE FROM departments WHERE department_name = $1", [
      departmentName,
    ]);

    await Promise.all(
      memberIds.rows.map(async (member) => {
        if (member.user_id === req.user.id) {
          await db.query(
            "UPDATE users SET department_id = NULL WHERE user_id = $1",
            [member.user_id]
          );
        } else {
          await db.query(
            "UPDATE users SET role = 'Employee', department_id = NULL WHERE user_id = $1",
            [member.user_id]
          );
        }
      })
    );

    res.status(200).json({ success: true, message: "Department deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
