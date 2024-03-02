const db = require("../db");

const getRemainingHours = async (userId) => {
  const query = `
    SELECT SUM(work_hours) AS total_assigned_hours
    FROM ProjectProposals
    WHERE proposed_user_id = $1 AND proposal_type = 'assignment';
  `;
  const values = [userId];
  const result = await db.query(query, values);
  const totalAssignedHours = result.rows[0].total_assigned_hours || 0;
  return 8 - totalAssignedHours;
};

exports.proposeAssignment = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const projectManager = req.user.role === "Project Manager";

    if (!projectManager) {
      return res.status(403).json({
        error:
          "Access forbidden. Only Project Managers can propose team members for projects.",
      });
    }

    const { userId, workHours, roles, comments } = req.body;
    const user = await db.query("SELECT * FROM users where user_id = $1 ", [
      userId,
    ]);

    if (!userId || !workHours || !roles || !comments) {
      return res.status(400).json({
        error: "All fields (userId, workHours, roles, comments) are required.",
      });
    }
    const remainingHours = await getRemainingHours(userId);

    if (workHours < 1 || workHours > remainingHours) {
      return res.status(400).json({
        error: `Invalid workHours. Should be between 1 and ${remainingHours}.`,
      });
    }

    const proposalQuery = `
        INSERT INTO ProjectProposals (project_id, proposed_user_id, department_id, proposal_type, work_hours, roles, comments)
        VALUES ($1, $2, $3, 'assignment', $4, $5, $6)
        RETURNING proposal_id;
      `;
    const proposalValues = [
      projectId,
      userId,
      user.rows.department_id,
      workHours,
      roles,
      comments,
    ];
    const proposalResult = await db.query(proposalQuery, proposalValues);
    const proposalId = proposalResult.rows[0].proposal_id;

    const teamStatusUpdateQuery = `
      INSERT INTO ProjectTeamStatus (project_id, user_id, status)
      VALUES ($1, $2, 'proposed');
    `;
    const teamStatusUpdateValues = [projectId, userId];
    await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);

    res.status(200).json({
      success: true,
      message: "Assignment proposal for team member submitted successfully.",
      proposedAssignment: {
        userId,
        workHours,
        roles,
        comments,
        proposalId,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.proposeDeallocation = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const projectManager = req.user.role === "Project Manager";
    const departmentId = req.user.department_id;

    if (!projectManager) {
      return res.status(403).json({
        error:
          "Access forbidden. Only Project Managers can propose deallocation of team members from projects.",
      });
    }

    const { userId, deallocationReason } = req.body;

    if (!userId || !deallocationReason) {
      return res.status(400).json({
        error: "All fields (userId, deallocationReason) are required.",
      });
    }

    const checkUserQuery = `
      SELECT *
      FROM ProjectTeam
      WHERE project_id = $1
        AND user_id = $2;
    `;
    const checkUserValues = [projectId, userId];
    const userExistsResult = await db.query(checkUserQuery, checkUserValues);

    if (userExistsResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found in project team. Deallocation not possible.",
      });
    }
    const proposalQuery = `
        INSERT INTO ProjectProposals (project_id, proposed_user_id, department_id, proposal_type, deallocation_reason)
        VALUES ($1, $2, $3, 'deallocation', $4)
        RETURNING proposal_id;
      `;
    const proposalValues = [
      projectId,
      userId,
      departmentId,
      deallocationReason,
    ];
    const proposalResult = await db.query(proposalQuery, proposalValues);
    const proposalId = proposalResult.rows[0].proposal_id;
    const teamStatusUpdateQuery = `
      INSERT INTO ProjectTeamStatus (project_id, user_id, status)
      VALUES ($1, $2, 'proposed')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    `;
    const teamStatusUpdateValues = [projectId, userId];
    await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);

    res.status(200).json({
      success: true,
      message: "Deallocation proposal for team member submitted successfully.",
      proposedDeallocation: {
        userId,
        deallocationReason,
        proposalId,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployeeProposals = async (req, res) => {
  try {
    const departmentManager = req.user.role === "Department Manager";
    const departmentId = req.user.department_id;

    if (!departmentManager) {
      return res.status(403).json({
        error: "Access forbidden. Only Department Managers can view proposals.",
      });
    }

    const query = `
        SELECT *
        FROM ProjectProposals
        WHERE department_id = $1
          AND proposal_type IN ('assignment', 'deallocation');
      `;
    const values = [departmentId];
    const result = await db.query(query, values);

    res.status(200).json({
      success: true,
      proposals: result.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.processProposal = async (req, res) => {
  try {
    const departmentManager = req.user.role === "Department Manager";
    const { proposalId, decision } = req.body;

    if (!departmentManager) {
      return res.status(403).json({
        error:
          "Access forbidden. Only Department Managers can process proposals.",
      });
    }

    if (!proposalId || !decision) {
      return res.status(400).json({
        error: "All fields (proposalId, decision) are required.",
      });
    }
    if (!["accepted", "rejected"].includes(decision)) {
      return res.status(400).json({
        error:
          "Invalid decision. It should be either 'accepted' or 'rejected'.",
      });
    }

    const proposalQuery = `
      SELECT *
      FROM ProjectProposals
      WHERE proposal_id = $1
        AND department_id = $2
        AND proposal_type IN ('assignment', 'deallocation');
    `;
    const proposalValues = [proposalId, req.user.department_id];
    const proposalResult = await db.query(proposalQuery, proposalValues);

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        error: "Proposal not found or not applicable to your department.",
      });
    }

    const { project_id, proposed_user_id, work_hours, roles, comments } =
      proposalResult.rows[0];

    if (decision === "accepted" && proposalResult.rows[0].proposal_type === "assignment") {
      const teamStatusUpdateQuery = `
        INSERT INTO ProjectTeamStatus (project_id, user_id, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (project_id, user_id) DO UPDATE
        SET status = 'active';
      `;
      const teamStatusUpdateValues = [project_id, proposed_user_id];
      await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);
    } else if (decision === "accepted" && proposalResult.rows[0].proposal_type === "deallocation") {
      const teamStatusUpdateQuery = `
        UPDATE ProjectTeamStatus
        SET status = 'past'
        WHERE project_id = $1 AND user_id = $2;
      `;
      const teamStatusUpdateValues = [project_id, proposed_user_id];
      await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);
    }

    const deleteProposalQuery = `
      DELETE FROM ProjectProposals
      WHERE proposal_id = $1;
    `;
    const deleteProposalValues = [proposalId];
    await db.query(deleteProposalQuery, deleteProposalValues);
    res.status(200).json({
      success: true,
      message: `Proposal ${proposalId} ${
        decision === "accepted" ? "accepted" : "rejected"
      } successfully.`,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


