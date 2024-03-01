
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
