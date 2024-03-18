const db = require("../db");

exports.createProject = async (req, res) => {
  try {
    const {
      project_name,
      project_period,
      start_date,
      deadline_date,
      status,
      general_description,
      technology_stack,
      team_roles,
    } = req.body;

    if (!project_name || !project_period || !start_date || !status) {
      return res.status(400).json({
        error:
          "All fields (project_name, project_period, start_date, status) are required.",
      });
    }

    const validProjectPeriod = /^(Fixed|Ongoing)$/i.test(project_period);
    if (!validProjectPeriod) {
      return res.status(400).json({
        error: "Invalid project_period. It should be 'Fixed' or 'Ongoing'.",
      });
    }

    if (!isValidDate(start_date)) {
      return res
        .status(400)
        .json({ error: "Invalid start_date format. Please use YYYY-MM-DD." });
    }

    const existingProject = await db.query(
      "SELECT * FROM Projects WHERE project_name = $1",
      [project_name]
    );
    if (existingProject.rows.length > 0) {
      return res.status(400).json({
        error:
          "Project name must be unique. A project with the same name already exists.",
      });
    }

    if (project_period === "Fixed") {
      if (!deadline_date) {
        return res
          .status(400)
          .json({ error: "Deadline date is required for Fixed projects." });
      }
      if (!isValidDate(deadline_date)) {
        return res.status(400).json({
          error: "Invalid deadline_date format. Please use YYYY-MM-DD.",
        });
      }
    }

    const allowedStatuses = ["Not Started", "Starting"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status. During project creation, only Not Started or Starting status is allowed.",
      });
    }

    const result = await db.query(
      "INSERT INTO Projects (project_name, project_period, start_date, deadline_date, status, general_description, technology_stack, project_manager_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [
        project_name,
        project_period,
        start_date,
        deadline_date,
        status,
        general_description,
        technology_stack,
        req.user.id,
      ]
    );

    const projectId = result.rows[0].project_id;

    for (const teamRole of team_roles) {
      await db.query(
        "INSERT INTO ProjectTeamRoles (project_id, role_name, members_count) VALUES ($1, $2, $3)",
        [projectId, teamRole.role_name, teamRole.members_count]
      );
    }

    res.status(201).json({
      success: true,
      message: "Project created successfully.",
      project: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getProjectByManager = async (req, res) => {
  try {
    const managerId = req.user.id;
    const organizationId = req.user.organizationId; // Presupunând că poți accesa ID-ul organizației din obiectul utilizatorului

    let projects;
    if (req.user.role === 'organization_admin') {
      // Dacă utilizatorul este administrator de organizație, căutăm proiectele managerilor din organizația sa
      projects = await db.query(
        `SELECT p.* 
         FROM Projects p
         INNER JOIN Users u ON p.project_manager_id = u.user_id
         WHERE u.organization_id = $1`,
        [organizationId]
      );
    } else {
      // Dacă utilizatorul nu este administrator de organizație, căutăm proiectele managerului curent
      projects = await db.query(
        "SELECT * FROM Projects WHERE project_manager_id = $1",
        [managerId]
      );
    }

    res.status(200).json({
      success: true,
      projects: projects.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};



exports.updateProject = async (req, res) => {
  try {
    const projectName = req.params.projectName;

    const {
      project_name,
      project_period,
      start_date,
      deadline_date,
      status,
      general_description,
      technology_stack,
      team_roles,
    } = req.body;

    const existingProject = await db.query(
      "SELECT * FROM Projects WHERE project_name = $1",
      [projectName]
    );
    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (project_period && !["Fixed", "Ongoing"].includes(project_period)) {
      return res.status(400).json({
        error:
          "Invalid project_period value. Accepted values are 'Fixed' or 'Ongoing'.",
      });
    }

    const allowedStatuses = ["Not Started", "Starting"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status. During project update, only Not Started or Starting status is allowed.",
      });
    }

    const currentDate = new Date();

    if (start_date && !isValidDate(start_date)) {
      return res
        .status(400)
        .json({ error: "Invalid start_date format. Please use YYYY-MM-DD." });
    }

    if (deadline_date) {
      if (!isValidDate(deadline_date)) {
        return res.status(400).json({
          error: "Invalid deadline_date format. Please use YYYY-MM-DD.",
        });
      }

      if (new Date(deadline_date) <= currentDate) {
        return res
          .status(400)
          .json({ error: "Deadline date must be in the future." });
      }
    }

    const updatedProject = {
      project_name: project_name || existingProject.rows[0].project_name,
      project_period: project_period || existingProject.rows[0].project_period,
      start_date: start_date || existingProject.rows[0].start_date,
      deadline_date: deadline_date || existingProject.rows[0].deadline_date,
      status: status || existingProject.rows[0].status,
      general_description:
        general_description || existingProject.rows[0].general_description,
      technology_stack:
        technology_stack || existingProject.rows[0].technology_stack,
    };

    const result = await db.query(
      `
      UPDATE Projects
      SET
        project_name = $1,
        project_period = $2,
        start_date = $3,
        deadline_date = $4,
        status = $5,
        general_description = $6,
        technology_stack = $7
      WHERE project_name = $8
      RETURNING *
    `,
      [
        updatedProject.project_name,
        updatedProject.project_period,
        updatedProject.start_date,
        updatedProject.deadline_date,
        updatedProject.status,
        updatedProject.general_description,
        updatedProject.technology_stack,
        projectName,
      ]
    );

    if (team_roles && typeof team_roles[Symbol.iterator] === "function") {
      await db.query("DELETE FROM ProjectTeamRoles WHERE project_id = $1", [
        existingProject.rows[0].project_id,
      ]);

      for (const teamRole of team_roles) {
        await db.query(
          "INSERT INTO ProjectTeamRoles (project_id, role_name, members_count) VALUES ($1, $2, $3)",
          [
            existingProject.rows[0].project_id,
            teamRole.role_name,
            teamRole.members_count,
          ]
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully.",
      project: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};


// Funcție pentru a verifica formatul unei date
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return dateString.match(regex) !== null;
}


exports.deleteProject = async (req, res) => {
  try {
    const projectName = req.params.projectName;

    const existingProject = await db.query(
      "SELECT * FROM Projects WHERE project_name = $1",
      [projectName]
    );
    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: "Project not found." });
    }

    await db.query("DELETE FROM Projects WHERE project_name = $1", [
      projectName,
    ]);

    await db.query("DELETE FROM ProjectTeamRoles WHERE project_id = $1", [
      existingProject.rows[0].project_id,
    ]);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully.",
      project: existingProject.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.findAvailableEmployees = async (req, res) => {
  try {
    const { weeksToFinish } = req.body;
    
    if (weeksToFinish < 2 || weeksToFinish > 6) {
      return res.status(400).json({
        error: "Invalid value for WeeksToFinish. It should be between 2 and 6.",
      });
    }

    const result = await db.query(`
  SELECT *
  FROM users
  WHERE 
    availability_status = 'Fully Available'
    OR
    (
      availability_status = 'Partially Available' 
      AND availability_hours < 8
    )
    OR
    (
      availability_status = 'Unavailable' 
      AND 
      (
        SELECT COUNT(*)
        FROM projectteam
        WHERE projectteam.user_id = users.user_id
          AND (
            SELECT deadline_date
            FROM projects
            WHERE projects.project_id = projectteam.project_id
          ) <= NOW() + INTERVAL '${weeksToFinish} weeks'
      ) > 0
    )
`);

    res.status(200).json({
      success: true,
      message: "Employees found successfully.",
      employees: result.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.findEmployees = async (req, res) => {
  try {
    const { type, weeksToFinish } = req.body;

    let query = `
      SELECT *
      FROM users
      WHERE 
    `;

    switch (type) {
      case "fullyAvailable":
        query += "availability_status = 'Fully Available'";
        break;
      case "partiallyAvailable":
        query += "availability_status = 'Partially Available' AND availability_hours < 8";
        break;
      case "nearFinish":
        if (weeksToFinish < 2 || weeksToFinish > 6) {
          return res.status(400).json({
            error: "Invalid value for WeeksToFinish. It should be between 2 and 6.",
          });
        }
        query += `
          availability_status = 'Unavailable' 
          AND EXISTS (
            SELECT 1
            FROM projectteam
            JOIN projects ON projects.project_id = projectteam.project_id
            WHERE projectteam.user_id = users.user_id
              AND projects.deadline_date <= NOW() + INTERVAL '${weeksToFinish} weeks'
          )
        `;
        break;
      case "unavailable":
        query += "availability_status = 'Unavailable' AND availability_hours >= 8";
        break;
      default:
        
        query += `
          availability_status = 'Fully Available' 
          AND NOT EXISTS (
            SELECT 1
            FROM projectteam
            WHERE projectteam.user_id = users.user_id
          )
        `;
    }

    query += `
      AND EXISTS (
        SELECT 1
        FROM skills
        JOIN projectteam ON skills.author_id = projectteam.user_id
        JOIN projects ON projects.project_id = projectteam.project_id
        WHERE skills.author_id = users.user_id
          AND skills.skill_name IN (
            SELECT UNNEST(string_to_array(projects.technology_stack, ' '))
          )
      )`;

    const result = await db.query(query);
    const employees = result.rows;

    const successMessage = employees.length > 0
      ? "Employees found successfully."
      : "No employees found matching the specified criteria.";

    res.status(200).json({
      success: true,
      message: successMessage,
      employees,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};




exports.getProjectTeamView = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const departmentId = req.user.department_id;

    // Verificăm dacă utilizatorul este Project Manager sau Department Manager
    const isProjectManager = await isUserProjectManager(userId, projectId);
    const isDepartmentManager = await isUserDepartmentManager(userId, departmentId);

    // Verificăm dacă utilizatorul este membru al echipei de proiect (inclusiv propus sau dealocat)
    const isTeamMember = await isUserTeamMember(userId, projectId);

    if (!isProjectManager && !isDepartmentManager && !isTeamMember) {
      return res.status(403).json({
        error: "Access forbidden. You do not have permission to view the project team.",
      });
    }

    // Obținem informații despre proiect
    const projectInfoQuery = `
      SELECT *
      FROM Projects
      WHERE project_id = $1;
    `;
    const projectInfoValues = [projectId];
    const projectInfoResult = await db.query(projectInfoQuery, projectInfoValues);
    const projectInfo = projectInfoResult.rows[0];

    // Obținem membrii propuși pentru proiect
    const proposedMembersQuery = `
      SELECT users.*, ProjectProposals.*
      FROM ProjectProposals
      JOIN users ON ProjectProposals.proposed_user_id = users.user_id
      WHERE ProjectProposals.project_id = $1 AND ProjectProposals.proposal_type = 'assignment';
    `;
    const proposedMembersValues = [projectId];
    const proposedMembersResult = await db.query(proposedMembersQuery, proposedMembersValues);
    const proposedMembers = proposedMembersResult.rows;

    // Obținem membrii activi ai echipei de proiect
    const activeMembersQuery = `
      SELECT users.*, ProjectTeam.*
      FROM ProjectTeam
      JOIN users ON ProjectTeam.user_id = users.user_id
      WHERE ProjectTeam.project_id = $1 AND ProjectTeam.department_id = $2;
    `;
    const activeMembersValues = [projectId, departmentId];
    const activeMembersResult = await db.query(activeMembersQuery, activeMembersValues);
    const activeMembers = activeMembersResult.rows;

    // Obținem membrii passi ai echipei de proiect
    const pastMembersQuery = `
      SELECT users.*, ProjectTeamStatus.*
      FROM ProjectTeamStatus
      JOIN users ON ProjectTeamStatus.user_id = users.user_id
      WHERE ProjectTeamStatus.project_id = $1 AND ProjectTeamStatus.status = 'past';
    `;
    const pastMembersValues = [projectId];
    const pastMembersResult = await db.query(pastMembersQuery, pastMembersValues);
    const pastMembers = pastMembersResult.rows;

    res.status(200).json({
      success: true,
      projectTeam: {
        projectInfo,
        proposedMembers,
        activeMembers,
        pastMembers,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

// Funcție pentru a verifica dacă utilizatorul este Project Manager pentru un anumit proiect
async function isUserProjectManager(userId, projectId) {
  const projectManagerQuery = `
    SELECT project_manager_id
    FROM Projects
    WHERE project_id = $1 AND project_manager_id = $2;
  `;
  const projectManagerValues = [projectId, userId];
  const projectManagerResult = await db.query(projectManagerQuery, projectManagerValues);
  return projectManagerResult.rows.length > 0;
}

// Funcție pentru a verifica dacă utilizatorul este Department Manager pentru un anumit departament
async function isUserDepartmentManager(userId, departmentId) {
  const departmentManagerQuery = `
    SELECT department_manager_id
    FROM departments
    WHERE department_id = $1 AND department_manager_id = $2;
  `;
  const departmentManagerValues = [departmentId, userId];
  const departmentManagerResult = await db.query(departmentManagerQuery, departmentManagerValues);
  return departmentManagerResult.rows.length > 0;
}

// Funcție pentru a verifica dacă utilizatorul este membru al echipei de proiect (inclusiv propus sau dealocat)
async function isUserTeamMember(userId, projectId) {
  const teamMemberQuery = `
    SELECT user_id
    FROM ProjectTeam
    WHERE project_id = $1 AND user_id = $2;
  `;
  const teamMemberValues = [projectId, userId];
  const teamMemberResult = await db.query(teamMemberQuery, teamMemberValues);

  const proposedMemberQuery = `
    SELECT proposed_user_id
    FROM ProjectProposals
    WHERE project_id = $1 AND proposed_user_id = $2 AND proposal_type = 'assignment';
  `;
  const proposedMemberValues = [projectId, userId];
  const proposedMemberResult = await db.query(proposedMemberQuery, proposedMemberValues);

  const pastMemberQuery = `
    SELECT proposed_user_id
    FROM ProjectProposals
    WHERE project_id = $1 AND proposed_user_id = $2 AND proposal_type = 'deallocation';
  `;
  const pastMemberValues = [projectId, userId];
  const pastMemberResult = await db.query(pastMemberQuery, pastMemberValues);

  return teamMemberResult.rows.length > 0 || proposedMemberResult.rows.length > 0 || pastMemberResult.rows.length > 0;
}






