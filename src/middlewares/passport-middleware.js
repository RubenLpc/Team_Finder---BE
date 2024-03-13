const passport = require('passport')
const { Strategy } = require('passport-jwt')
const { SECRET } = require('../constants')
const db = require('../db')

const headerExtractor = function (req) {
  let token = null;
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  return token;
};

const opts = {
  secretOrKey: SECRET,
  jwtFromRequest: headerExtractor,
};

passport.use(
  new Strategy(opts, async ({ id }, done) => {
    try {
      const { rows } = await db.query(
        'SELECT user_id, email, username, role,organization_id,department_id FROM users WHERE user_id = $1',
        [id]
      );

      if (!rows.length) {
        throw new Error('401 not authorized');
      }

      let user = {
        id: rows[0].user_id,
        email: rows[0].email,
        username: rows[0].username,
        role: rows[0].role,
        organization_id: rows[0].organization_id,
        department_id: rows[0].department_id,
      };

      return done(null, user);
    } catch (error) {
      console.log(error.message);
      done(null, false);
    }
  })
);
