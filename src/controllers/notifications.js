const db = require("../db");


exports.getUserNotifications = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Obține toate notificările ne-citite ale utilizatorului din tabela notifications
      const userNotifications = await db.query(
        'SELECT notification_id, message, type, created_at FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );
  
      // Marchează notificările ca citite
      await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      );
  
      res.status(200).json({
        success: true,
        notifications: userNotifications.rows,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };