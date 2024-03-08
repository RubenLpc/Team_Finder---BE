const db = require("../db");

const getRemainingHours = async (userId) => {
  const query = `
    SELECT * FROM users where user_id = $1;
  `;
  const values = [userId];
  const result = await db.query(query, values);
  const totalAssignedHours = result.rows[0].availability_hours;
  return 8 - totalAssignedHours;
};

exports.proposeAssignment = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const { userId, workHours, roles, comments } = req.body;
    const user = await db.query("SELECT * FROM users where user_id = $1 ", [
      userId,
    ]);
    const existingProposal = await db.query(
      "SELECT * FROM ProjectProposals WHERE project_id = $1 AND proposed_user_id = $2",
      [projectId, userId]
    );

    if (existingProposal.rows.length > 0) {
      return res.status(400).json({
        error: `This Employee has already been proposed for assignment to this Project .`,
      });
    }

    const existingTeamMember = await db.query(
      "SELECT * FROM ProjectTeamStatus WHERE project_id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (existingTeamMember.rows.length > 0) {
      return res.status(400).json({
        error: `This Employee is already a team member in this Project.`,
      });
    }

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
    /*
    const skillRequirementsQuery = `
      SELECT skill_id, min_level
      FROM ProjectSkillRequirements
      WHERE project_id = $1;
    `;
    const skillRequirementsValues = [projectId];
    const skillRequirementsResult = await db.query(
      skillRequirementsQuery,
      skillRequirementsValues
    );
    const skillRequirements = skillRequirementsResult.rows;

    const userSkillsQuery = `
      SELECT skill_id, level
      FROM UserSkills
      WHERE user_id = $1;
    `;
    const userSkillsValues = [userId];
    const userSkillsResult = await db.query(userSkillsQuery, userSkillsValues);
    const userSkills = userSkillsResult.rows;

    for (const requirement of skillRequirements) {
      const matchingSkill = userSkills.find(
        (skill) => skill.skill_id === requirement.skill_id
      );

      if (!matchingSkill || matchingSkill.level < requirement.min_level) {
        return res.status(400).json({
          error: `User ${userId} does not meet the skill requirement for skill_id ${requirement.skill_id} at the required level ${requirement.min_level}.`,
        });
      }
    }
    */
    // Obține id-ul managerului de departament din tabela departments
    const departmentManagerIdResult = await db.query(
      "SELECT department_manager_id FROM departments WHERE department_id = $1",
      [user.rows[0].department_id]
    );
    const departmentManagerId =
      departmentManagerIdResult.rows[0].department_manager_id;

    const proposalQuery = `
        INSERT INTO ProjectProposals (project_id, proposed_user_id, department_id, proposal_type, work_hours, roles, comments)
        VALUES ($1, $2, $3, 'assignment', $4, $5, $6)
        RETURNING proposal_id;
      `;
    const proposalValues = [
      projectId,
      userId,
      user.rows[0].department_id,
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

    // Notificare către Managerul de Departament
    const departmentNotificationQuery = `
      INSERT INTO notifications (user_id, message, type)
      VALUES ($1, $2, $3);
    `;
    const departmentNotificationValues = [
      departmentManagerId,
      `Employee ${user.rows[0].username} proposed for assignment to Project ${projectId}.`,
      "Assignment Proposal",
    ];
    await db.query(departmentNotificationQuery, departmentNotificationValues);

    // Notificare către Angajatul Propus
    const employeeNotificationQuery = `
      INSERT INTO notifications (user_id, message, type)
      VALUES ($1, $2, $3);
    `;
    const employeeNotificationValues = [
      userId,
      `You have been proposed for assignment to Project ${projectId}.`,
      "Assignment Proposal",
    ];
    await db.query(employeeNotificationQuery, employeeNotificationValues);

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
    const departmentId = req.user.department_id;

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
      userExistsResult.rows[0].department_id,
      deallocationReason,
    ];
    const proposalResult = await db.query(proposalQuery, proposalValues);
    const proposalId = proposalResult.rows[0].proposal_id;
    const teamStatusUpdateQuery = `
  INSERT INTO ProjectTeamStatus (project_id, user_id, status)
  VALUES ($1, $2, 'proposed');
  
`;

    const teamStatusUpdateValues = [projectId, userId];
    await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);

    const departmentManagerIdResult = await db.query(
      "SELECT department_manager_id FROM departments WHERE department_id = $1",
      [userExistsResult.rows[0].department_id]
    );
    const departmentManagerId =
      departmentManagerIdResult.rows[0].department_manager_id;

    const departmentNotificationQuery = `
    INSERT INTO notifications (user_id, message, type)
    VALUES ($1, $2, $3);
  `;
    const departmentNotificationValues = [
      departmentManagerId,
      `Employee ${userId} proposed for deallocation from Project ${projectId}.`,
      "Deallocation Proposal",
    ];
    await db.query(departmentNotificationQuery, departmentNotificationValues);

    const employeeNotificationQuery = `
    INSERT INTO notifications (user_id, message, type)
    VALUES ($1, $2, $3);
  `;
    const employeeNotificationValues = [
      userId,
      `You have been proposed for deallocation from Project ${projectId}.`,
      "Deallocation Proposal",
    ];
    await db.query(employeeNotificationQuery, employeeNotificationValues);

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
    const departmentId = req.user.department_id;

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
    const { proposalId, decision } = req.body;

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

    const {
      project_id,
      proposed_user_id,
      work_hours,
      roles,
      comments,
      proposal_type,
    } = proposalResult.rows[0];

    if (decision === "accepted") {
      if (proposal_type === "assignment") {
        const addToTeamQuery = `
            INSERT INTO ProjectTeam (project_id, user_id, work_hours, roles, comments, department_id)
            VALUES ($1, $2, $3, $4, $5, $6);
          `;
        const addToTeamValues = [
          project_id,
          proposed_user_id,
          work_hours,
          roles,
          comments,
          req.user.department_id,
        ];
        await db.query(addToTeamQuery, addToTeamValues);

        const teamStatusUpdateQuery = `
            UPDATE ProjectTeamStatus
            SET status = 'active'
            WHERE project_id = $1 AND user_id = $2;
          `;
        const teamStatusUpdateValues = [project_id, proposed_user_id];
        await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);

        const updateUserAvailabilityQuery = `
            UPDATE users
            SET availability_hours = availability_hours + $1
            WHERE user_id = $2;
          `;
        const updateUserAvailabilityValues = [work_hours, proposed_user_id];
        await db.query(
          updateUserAvailabilityQuery,
          updateUserAvailabilityValues
        );
      } else if (proposal_type === "deallocation") {
        const getWorkHoursQuery = `
            SELECT work_hours
            FROM ProjectTeam
            WHERE project_id = $1 AND user_id = $2;
          `;
        const getWorkHoursValues = [project_id, proposed_user_id];
        const workHoursResult = await db.query(
          getWorkHoursQuery,
          getWorkHoursValues
        );
        const allocatedWorkHours = workHoursResult.rows[0].work_hours;

        const teamStatusUpdateQuery = `
            UPDATE ProjectTeamStatus
            SET status = 'past'
            WHERE project_id = $1 AND user_id = $2;
          `;
        const teamStatusUpdateValues = [project_id, proposed_user_id];
        await db.query(teamStatusUpdateQuery, teamStatusUpdateValues);

        const updateUserAvailabilityQuery = `
            UPDATE users
            SET availability_hours = availability_hours - $1
            WHERE user_id = $2;
          `;
        const updateUserAvailabilityValues = [
          allocatedWorkHours,
          proposed_user_id,
        ];
        await db.query(
          updateUserAvailabilityQuery,
          updateUserAvailabilityValues
        );

        const removeFromTeamQuery = `
            DELETE FROM ProjectTeam
            WHERE project_id = $1 AND user_id = $2;
          `;
        const removeFromTeamValues = [project_id, proposed_user_id];
        await db.query(removeFromTeamQuery, removeFromTeamValues);
      }
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
