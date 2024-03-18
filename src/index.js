 const express = require('express')
 const app = express()
 const{PORT, CLIENT_URL} = require('./constants')
 const cookieParser = require('cookie-parser')
 const passport = require('passport')
 const cors = require('cors')

 //import passport middleware
 require('./middlewares/passport-middleware')

 //initialize middlewares
 app.use(express.json())
 app.use(cookieParser())
 app.use(cors({origin: ['http://localhost:3000', 'http://localhost:3001', 'https://atc-2024-cyber-creators-fe-linux-web-app.azurewebsites.net/'],
 methods : 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
 preflightContinue : false,
 optionsSuccessStatus : 204,
  credentials: true,}))
 app.use(passport.initialize())
 app.use(express.static("public"))
 

 //import routes
 const authRoutes = require('./routes/auth')
 const departments = require('./routes/departments')
 const nice_to_have = require('./routes/nice_to_have')
 const organizator = require('./routes/organizator')
 const projects = require('./routes/projects')
 const proposals = require('./routes/proposals')
 const skills = require('./routes/skills')
 const user_skills = require('./routes/user_skills')
 const view_projects = require('./routes/view_projects')

 //initialize routes
 
 app.use('/api',[authRoutes, departments, nice_to_have, organizator, projects, proposals, skills, user_skills, view_projects])

 
 
 //app start
 const appStart = () =>{
    try{
        app.listen(PORT,() =>{
            console.log(`The app is runing at http://localhost:${PORT}`);
        })
    }catch(error){
        console.log(`Error: ${error.message}`)
    }
 }
 appStart()

 