const db = require('../db')

exports.getSkillStatistics = async (req, res) => {
    try {
      const departmentId = req.user.department_id;
  
      const departmentSkills = await db.query(
        'SELECT s.skill_name, us.level, COUNT(*) as count FROM userskills us ' +
        'JOIN skills s ON us.skill_id = s.skill_id ' +
        'JOIN users u ON us.user_id = u.user_id ' +
        'WHERE u.department_id = $1 ' +
        'GROUP BY s.skill_name, us.level',
        [departmentId]
      );
  
      const skillStatistics = {};

      departmentSkills.rows.forEach(({ skill_name, level, count }) => {

        if (!skillStatistics[skill_name]) {
          skillStatistics[skill_name] = {
            total: 0,
            levels: {
              Learns: 0,
              Knows: 0,
              Does: 0,
              Helps: 0,
              Teaches: 0,
            },
          };
        }
  
   
        level = parseInt(level, 10);
  
      
        if (!isNaN(level)) {
            
          count = parseInt(count, 10);
          switch (level) {
            case 1:
              skillStatistics[skill_name].levels.Learns += count;
              break;
            case 2:
              skillStatistics[skill_name].levels.Knows += count;
              break;
            case 3:
              skillStatistics[skill_name].levels.Does += count;
              break;
            case 4:
              skillStatistics[skill_name].levels.Helps += count;
              break;
            case 5:
              skillStatistics[skill_name].levels.Teaches += count;
              break;
            default:
              break;
          }
  
          
          if (!isNaN(count)) {
            skillStatistics[skill_name].total += count;
          }
        }
      });
  
      res.status(200).json({
        success: true,
        skillStatistics,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };
  
  
  
  
  
  