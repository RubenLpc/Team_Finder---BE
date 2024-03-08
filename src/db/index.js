const { Pool } = require("pg");
const fs = require('fs');

const pool = new Pool({
    host: "atc-2024-postgresql-server.postgres.database.azure.com",
    user: "cybercreators_lfg7uh",
    password: "ATC2024!SecurePassword",
    database: "atc-2024-cyber-creators-postgresql-database",
    port: 5432,
    ssl: true,
});


module.exports = {
  query: (text, params) => pool.query(text, params),
};
