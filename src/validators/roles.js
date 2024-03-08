const db = require('../db')

exports.checkOrganizationAdmin = async (req, res, next) => {
    try {
      if (req.user.role !== "Organization Admin") {
        return res.status(403).json({
          error: "Access forbidden. Only Organization Admins can manage team roles.",
        });
      }
      next();
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };

  