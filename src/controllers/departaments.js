const db = require("../db");

exports.create_departament = async (req, res) => {
  try {
    const { department_name } = req.body;

    const isOrgAdmin = req.user.role === "Organization Admin";

    if (!isOrgAdmin) {
      return res.status(403).json({
        error:
          "Access forbidden. Only Organization Admins can perform this action.",
      });
    }

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
      "SELECT * FROM users WHERE username = $1 AND role = 'Employee'",
      [manager_name]
    );

    if (managerCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Employee not found or not eligible to be a manager" });
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
    console.log(req.user)
    let departmentId = req.user.department_id;

    if (req.user.role !== "Department Manager") {
      return res.status(403).json({
        error: "Access forbidden. Only Department Managers can add employees to the department.",
      });
    }

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
    const result = await db.query(
      "SELECT * FROM users WHERE department_id = $1",
      [departmentId]
    );

    res.status(200).json({
      succes: true,
      users: result.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
