const db = require("../db");

exports.getOrganizationMembers = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const users = await db.query(
      "SELECT * from users WHERE organization_id = $1",
      [organizationId]
    );
    if (users.rows.length === 0)
      return res.status(404).json({ error: "Organization not found" });

    res.status(200).json({
      succes: true,
      users: users.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.assignEmployeeRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { employeeName } = req.params;

    if (req.user.role !== "Organization Admin") {
      return res.status(403).json({
        error:
          "Access forbidden. Only Organization Admins can assign roles to employees.",
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
        error:
          "Access forbidden. You can only assign roles to employees in the same organization.",
      });
    }

    if (req.user.organization_id !== employeeCheck.rows[0].organization_id) {
      return res.status(403).json({
        error:
          "Access forbidden. You can only assign roles to employees in the same organization.",
      });
    }
    const result = await db.query(
      "UPDATE users SET role = $1 WHERE username = $2 RETURNING *",
      [role, employeeName]
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


exports.getOrganizationTeamRoles = async (req, res) => {
  try {
    const { organization_id } = req.user; // Preiați ID-ul organizației din obiectul de utilizator

    const roles = await db.query(
      'SELECT * FROM TeamRoles WHERE organization_id = $1',
      [organization_id]
    );

    res.status(200).json({
      success: true,
      roles: roles.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.createTeamRole = async (req, res) => {
  try {
    const { role_name } = req.body;
    const { organization_id } = req.user; // Preiați ID-ul organizației din obiectul de utilizator

    const existingRole = await db.query(
      "SELECT * FROM TeamRoles WHERE role_name = $1 AND organization_id = $2",
      [role_name, organization_id]
    );

    if (existingRole.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Role already exists for the organization." });
    }

    const result = await db.query(
      "INSERT INTO TeamRoles (organization_id, role_name) VALUES ($1, $2) RETURNING *",
      [organization_id, role_name]
    );

    res.status(201).json({
      success: true,
      role: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.updateTeamRole = async (req, res) => {
  try {
    const { role_name } = req.params;
    const { new_role_name } = req.body;

    const result = await db.query(
      'UPDATE TeamRoles SET role_name = $1 WHERE role_name = $2 RETURNING *',
      [new_role_name, role_name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Role not found." });
    }

    res.status(200).json({
      success: true,
      role: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeamRole = async (req, res) => {
  try {
    const { role_name } = req.params;

    const result = await db.query(
      'DELETE FROM TeamRoles WHERE role_name = $1 RETURNING *',
      [role_name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Role not found." });
    }

    res.status(200).json({
      success: true,
      message: "Role deleted successfully.",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};