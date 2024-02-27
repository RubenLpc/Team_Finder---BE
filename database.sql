-- users table
create table users(
    user_id serial primary key,
    username varchar(255) not null,
    email varchar(255) unique not null,
    password varchar(255) not null,
    );
