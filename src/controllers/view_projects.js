const db = require('../db')

exports.viewEmployeeProjects = async (req, res) => {
    try {
      const userId = req.user.id;
  
      const currentProjectsQuery = `
        SELECT Projects.project_name, ProjectTeam.roles, Projects.technology_stack
        FROM Projects, ProjectTeam
        WHERE Projects.project_id = ProjectTeam.project_id
          AND ProjectTeam.user_id = $1
          AND Projects.status <> 'Closed';
      `;
  
      const currentProjects = await db.query(currentProjectsQuery, [userId]);

      const pastProjectsQuery = `
        SELECT Projects.project_name, ProjectTeam.roles, Projects.technology_stack
        FROM Projects, ProjectTeam
        WHERE Projects.project_id = ProjectTeam.project_id
          AND ProjectTeam.user_id = $1
          AND Projects.status = 'Closed';
      `;
  
      const pastProjects = await db.query(pastProjectsQuery, [userId]);
   
      res.status(200).json({
        success: true,
        employeeProjects: {
          currentProjects : currentProjects.rows,
          pastProjects : pastProjects.rows,
        },
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };


  exports.viewDepartmentProjects = async (req, res) => {
    try {
      const departmentManager = req.user.role === 'Department Manager';
      const departmentId = req.user.department_id;
  
      if (!departmentManager) {
        return res.status(403).json({
          error: 'Access forbidden. Only Department Managers can view department projects.',
        });
      }
  
      const departmentMembersQuery = `
        SELECT user_id
        FROM Users
        WHERE department_id = $1;
      `;
  
      const departmentMembersResult = await db.query(departmentMembersQuery, [departmentId]);
      const departmentMemberIds = departmentMembersResult.rows.map(member => member.user_id);
  
      const departmentProjectsQuery = `
        SELECT project_id, project_name, deadline_date, status
        FROM Projects
        WHERE EXISTS (
          SELECT 1
          FROM ProjectTeam
          WHERE ProjectTeam.project_id = Projects.project_id
            AND ProjectTeam.user_id = ANY($1)
        );
      `;
  
      const departmentProjects = await db.query(departmentProjectsQuery, [departmentMemberIds]);
  
      // Obține membrii pentru fiecare proiect
      const projectMembersQuery = `
        SELECT project_id, user_id, roles
        FROM ProjectTeam
        WHERE project_id = ANY($1);
      `;
  
      const projectMembers = await db.query(projectMembersQuery, [departmentProjects.rows.map(project => project.project_id)]);
  
      const memberNamesQuery = `
        SELECT user_id, username
        FROM Users
        WHERE user_id = ANY($1);
      `;
  
      const memberNames = await db.query(memberNamesQuery, [projectMembers.rows.map(member => member.user_id)]);
  
      const projectsWithMembers = departmentProjects.rows.map(project => {
        const members = projectMembers.rows
          .filter(member => member.project_id === project.project_id)
          .map(member => {
            const userName = memberNames.rows.find(name => name.user_id === member.user_id)?.username;
            return { user_id: member.user_id, username: userName, roles: member.roles };
          });
        return { ...project, members };
      });
  
      res.status(200).json({
        success: true,
        departmentProjects: projectsWithMembers,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };

  
  exports.viewProjectDetails = async (req, res) => {
    try {
        const projectName = req.params.projectName; // Presupunând că parametrul numelui proiectului este inclus în URL

        const projectDetailsQuery = `
            SELECT
                project_id,
                project_name,
                project_period,
                start_date,
                deadline_date,
                status AS project_status,
                general_description,
                technology_stack
            FROM Projects
            WHERE project_name = $1;
        `;

        const projectDetailsResult = await db.query(projectDetailsQuery, [projectName]);

        if (projectDetailsResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found.',
            });
        }

        const projectId = projectDetailsResult.rows[0].project_id;

        const teamMembersQuery = `
            SELECT user_id, roles
            FROM ProjectTeam
            WHERE project_id = $1;
        `;

        const teamMembersResult = await db.query(teamMembersQuery, [projectId]);

        // Obține numele membrilor într-o interogare separată
        const memberIds = teamMembersResult.rows.map(member => member.user_id);
        const memberNamesQuery = `
            SELECT user_id, username
            FROM Users
            WHERE user_id = ANY($1);
        `;

        const memberNamesResult = await db.query(memberNamesQuery, [memberIds]);

        const teamMembers = teamMembersResult.rows.map(member => {
            const memberName = memberNamesResult.rows.find(name => name.user_id === member.user_id)?.username;
            return {
                user_id: member.user_id,
                username: memberName,
                roles: member.roles,
                status: projectDetailsResult.rows[0].project_status,
            };
        });

        const projectDetails = {
            project_name: projectDetailsResult.rows[0].project_name,
            project_period: projectDetailsResult.rows[0].project_period,
            start_date: projectDetailsResult.rows[0].start_date,
            deadline_date: projectDetailsResult.rows[0].deadline_date,
            project_status: projectDetailsResult.rows[0].project_status,
            general_description: projectDetailsResult.rows[0].general_description,
            technology_stack: projectDetailsResult.rows[0].technology_stack,
            team_members: teamMembers,
        };

        res.status(200).json({
            success: true,
            projectDetails: projectDetails,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
};



  
  
  
  

  