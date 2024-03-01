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
      return res
        .status(403)
        .json({
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
      return res
        .status(403)
        .json({
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
