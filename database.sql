
create table users(
    user_id serial primary key,
    username varchar(255) not null,
    email varchar(255) unique not null,
    password varchar(255) not null,
    );

CREATE TABLE Skills (
  skill_id SERIAL PRIMARY KEY,
  category_id INTEGER,
  skill_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  author_id INTEGER
  departments VARCHAR(255) 

);

CREATE TABLE SkillCategories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) UNIQUE NOT NULL,
  manager_id INTEGER
);

CREATE TABLE UserSkills (
    user_skill_id SERIAL PRIMARY KEY,
    user_id INT,
    skill_id INT,
    level INT CHECK (level BETWEEN 1 AND 5),
    experience VARCHAR(20) CHECK (experience IN ('0-6 months', '6-12 months', '1-2 years', '2-4 years', '4-7 years', '>7 years')),
    
);


CREATE TABLE ProjectTeamRoles (
    project_id INT ,
    role_name VARCHAR(255) NOT NULL,
    members_count INT NOT NULL

);

CREATE TABLE Projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    project_period VARCHAR(20) NOT NULL CHECK (project_period IN ('Fixed', 'Ongoing')),
    start_date DATE NOT NULL,
    deadline_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Not Started', 'Starting', 'In Progress', 'Closing', 'Closed')),
    general_description TEXT,
    technology_stack TEXT
);

CREATE TABLE ProjectTeam (
    project_id INT,
    user_id INT,
    work_hours INT,
    roles VARCHAR(255),
    comments TEXT
 
);

CREATE TABLE ProjectProposals (
    proposal_id SERIAL PRIMARY KEY,
    project_id INTEGER,
    proposed_user_id INTEGER,
    department_id INTEGER,
    proposal_type VARCHAR(20), 
    deallocation_reason TEXT,
     work_hours INT,
    roles VARCHAR(255),
    comments TEXT
    
);


CREATE TABLE ProjectTeamStatus (
    team_status_id SERIAL PRIMARY KEY,
    project_id INTEGER,
    user_id INTEGER,
    status VARCHAR(20)
   
);


CREATE TABLE SkillEndorsements (
  endorsement_id SERIAL PRIMARY KEY,
  user_id INT ,
  skill_id INT ,
  description TEXT,
  type VARCHAR(50) CHECK (type IN ('Training', 'Course', 'Certification', 'Project')),
  title VARCHAR(255),
  project_id INT
  

);


CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT current_timestamp
  
);

CREATE TABLE ProjectSkillRequirements (
    requirement_id SERIAL PRIMARY KEY,
    project_id INTEGER,
    skill_id INTEGER,
    min_level INTEGER CHECK (min_level BETWEEN 1 AND 5)
    
);

