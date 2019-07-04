CREATE TABLE users( name VARCHAR(80), url VARCHAR(255), step integer, auth VARCHAR(255) );
CREATE INDEX idxName ON users(name);