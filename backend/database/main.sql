-- Create organization table with filelist column
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    file_info JSON
);

-- Update users table to include org_id
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
--     is_admin BOOLEAN DEFAULT FALSE,
    org_id INT,
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Update normal_users table to include org_id
CREATE TABLE normal_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    admin_id INT,
    org_id INT,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Create sessions table with user_id and normal_user_id foreign keys
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    normal_user_id INT NULL,
    prompts JSON,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (normal_user_id) REFERENCES normal_users(id)
);

ALTER TABLE normal_users ADD COLUMN email VARCHAR(255) UNIQUE;
ALTER TABLE normal_users ADD COLUMN position VARCHAR(100);