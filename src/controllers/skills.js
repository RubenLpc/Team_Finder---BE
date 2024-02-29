const db = require('../db')

exports.createSkill = async (req, res) => {
    try {
      const { category_name, skill_name, description } = req.body;
      const author_id = req.user.id;
  
      if (req.user.role !== 'Department Manager') {
        return res.status(403).json({ error: 'Access forbidden. Only Department Managers can create skills.' });
      }
  
      const existingSkill = await db.query('SELECT * FROM skills WHERE skill_name = $1', [skill_name]);
  
      if (existingSkill.rows.length > 0) {
        return res.status(400).json({ error: 'Skill already exists' });
      }
  
      let category_id;
  
      const existingCategory = await db.query('SELECT * FROM skillcategories WHERE category_name = $1', [category_name]);
  
      if (existingCategory.rows.length === 0) {
        const result = await db.query(
          'INSERT INTO skillcategories (category_name, manager_id) VALUES ($1, $2) RETURNING *',
          [category_name, author_id]
        );
  
        category_id = result.rows[0].category_id;
      } else {
        category_id = existingCategory.rows[0].category_id;
      }
  
      const result = await db.query(
        'INSERT INTO skills (category_id, skill_name, description, author_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [category_id, skill_name, description, author_id]
      );
  
      res.status(201).json({
        success: true,
        skill: result.rows[0],
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };
  