-- users table
create table users(
    user_id serial primary key,
    username varchar(255) not null,
    email varchar(255) unique not null,
    password varchar(255) not null,
    );

CREATE TABLE Skills (
  skill_id SERIAL PRIMARY KEY,
  category_id INTEGER,
  skill_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  author_id INTEGER

);

CREATE TABLE SkillCategories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) UNIQUE NOT NULL,
  manager_id INTEGER
);