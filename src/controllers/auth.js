const db = require("../db");
const { hash } = require("bcryptjs");
const { sign } = require("jsonwebtoken");
const { SECRET } = require("../constants");
const { use } = require("passport");

exports.getUsers = async (req, res) => {
  try {
    const { rows } = await db.query("select user_id, email from users");

    return res.status(200).json({
      success: true,
      users: rows,
    });
  } catch (error) {
    console.log(error.message);
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const org_id = req.user.organization_id;
    const role = "Employee";
    const hashedPassword = await hash(password, 10);
    console.log(req.user)
    const newUser = await db.query(
      "insert into users(username,email,password,role,organization_id) values ($1 , $2, $3, $4, $5) returning *",
      [name, email, hashedPassword, role, org_id]
    );
    let payload = {
      id: newUser.rows[0].user_id,
      email: newUser.rows[0].email,
    };
    const token = await sign(payload, SECRET);
    const maxAge = 3600 * 1000;
    return res.status(201).cookie("token", token, { httpOnly: true,maxAge,sameSite: 'Lax' }).json({
      success: true,
      message: "The registration was succefull",
      accountType: role,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.register_admins = async (req, res) => {
  try {
    const { name, email, password, organization_name, hq_adress } = req.body;
    const role = "Organization Admin";
  
    const hashedPassword = await hash(password, 10);
    await db.query(
      "insert into organizations(organization_name,headquarter_address) values ($1 , $2)",
      [organization_name, hq_adress]
    );
    const result = await db.query(
      "SELECT * from organizations WHERE organization_name = $1",
      [organization_name]
    );
    const id = result.rows[0].organization_id;
    const user = await db.query(
      "insert into users(username,email,password,role,organization_id) values ($1 , $2, $3, $4, $5) returning *",
      [name, email, hashedPassword, role, id]
    );

    
 
  let payload = {
    id: user.rows[0].user_id,
    email: user.rows[0].email,
  };
  const token = await sign(payload, SECRET);
  const maxAge = 3600 * 1000;
    return res.status(201).cookie("token", token, { httpOnly: true,maxAge ,sameSite: 'Lax' }).json({
      success: true,
      message: "The registraion was succefull",
      organization_id: id,
      accountType: role,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  
  let user = req.user;

  let payload = {
    id: user.user_id,
    email: user.email
  };

  try {
    const token = await sign(payload, SECRET);
    const maxAge = 3600 * 1000;
    return res.status(200).cookie("token", token, { httpOnly: true,maxAge,sameSite: 'Lax'  }).json({
      success: true,
      message: "Logged in succefully",
      token : token,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.protected = async (req, res) => {
  try {
    return res.status(200).json({
      info: "Protected Info",
    });
  } catch (error) {
    console.log(error.message);
  }
};

exports.logout = async (req, res) => {
  try {

    return res.status(200).clearCookie("token", { httpOnly: true }).json({
      success: true,
      message: "Logged out succefully",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};
