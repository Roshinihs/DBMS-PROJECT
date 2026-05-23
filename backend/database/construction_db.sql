USE construction_db;

-- 1. Builder Table
CREATE TABLE Builder (
    Builder_ID INT PRIMARY KEY AUTO_INCREMENT,
    Builder_Code VARCHAR(20) UNIQUE,
    Name VARCHAR(100),
    Contact VARCHAR(15),
    Email VARCHAR(100)
);

-- 2. Project Table
CREATE TABLE Project (
    Project_ID INT PRIMARY KEY AUTO_INCREMENT,
    Project_Code VARCHAR(20),
    Builder_ID INT,
    Name VARCHAR(100),
    Location VARCHAR(100),
    Budget DECIMAL(10,2),
    Start_Date DATE,
    End_Date DATE,
    FOREIGN KEY (Builder_ID) REFERENCES Builder(Builder_ID)
);

-- 3. Approval Table (RERA)
CREATE TABLE Approval (
    Approval_ID INT PRIMARY KEY AUTO_INCREMENT,
    Project_ID INT,
    Approval_Date DATE,
    Approval_Status VARCHAR(50),
    Application_Date DATE,
    Document_Submission_Date DATE,
    Remark VARCHAR(200),
    FOREIGN KEY (Project_ID) REFERENCES Project(Project_ID)
);

-- 4. Tasks Table
CREATE TABLE Tasks (
    Task_ID INT PRIMARY KEY AUTO_INCREMENT,
    Project_ID INT,
    Task_Name VARCHAR(100),
    Status VARCHAR(50),
    Planned_Start_Date DATE,
    Planned_End_Date DATE,
    Actual_Start_Date DATE,
    Actual_End_Date DATE,
    FOREIGN KEY (Project_ID) REFERENCES Project(Project_ID)
);

-- 5. Progress Table
CREATE TABLE Progress (
    Progress_ID INT PRIMARY KEY AUTO_INCREMENT,
    Task_ID INT,
    Update_Date DATE,
    Percentage_Completed INT,
    FOREIGN KEY (Task_ID) REFERENCES Tasks(Task_ID)
);

-- 6. Delay Table
CREATE TABLE Delay (
    Delay_ID INT PRIMARY KEY AUTO_INCREMENT,
    Task_ID INT,
    Delay_Date DATE,
    Delay_Days INT,
    Delay_Reason VARCHAR(200),
    FOREIGN KEY (Task_ID) REFERENCES Tasks(Task_ID)
);
CREATE TABLE Workers (
    Worker_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100),
    Role VARCHAR(50),
    Contact VARCHAR(15)
);
CREATE TABLE Task_Assignment (
    Assignment_ID INT PRIMARY KEY AUTO_INCREMENT,
    Task_ID INT,
    Worker_ID INT,
    Assigned_Date DATE,
    FOREIGN KEY (Task_ID) REFERENCES Tasks(Task_ID),
    FOREIGN KEY (Worker_ID) REFERENCES Workers(Worker_ID)
);
SHOW TABLES;
-- Builder
INSERT INTO Builder (Name, Contact, Email)
VALUES ('ABC Builders', '9876543210', 'abc@gmail.com');

-- Project
INSERT INTO Project (Builder_ID, Name, Location, Budget, Start_Date, End_Date)
VALUES (1, 'Apartment Project', 'Bangalore', 5000000, '2026-01-01', '2026-12-31');

-- Approval (RERA)
INSERT INTO Approval (Project_ID, Approval_Date, Approval_Status, Application_Date, Document_Submission_Date, Remark)
VALUES (1, '2026-01-10', 'Approved', '2026-01-01', '2026-01-05', 'All documents verified');

-- Tasks
INSERT INTO Tasks (Project_ID, Task_Name, Status, Planned_Start_Date, Planned_End_Date, Actual_Start_Date, Actual_End_Date)
VALUES 
(1, 'Foundation', 'Completed', '2026-01-01', '2026-01-10', '2026-01-01', '2026-01-12'),
(1, 'Walls', 'Ongoing', '2026-01-11', '2026-01-20', '2026-01-11', NULL);

-- Workers
INSERT INTO Workers (Name, Role, Contact)
VALUES 
('Ravi', 'Engineer', '9999999999'),
('Kumar', 'Labor', '8888888888');

-- Task Assignment
INSERT INTO Task_Assignment (Task_ID, Worker_ID, Assigned_Date)
VALUES 
(1, 1, '2026-01-01'),
(1, 2, '2026-01-01');

-- Progress
INSERT INTO Progress (Task_ID, Update_Date, Percentage_Completed)
VALUES 
(1, '2026-01-05', 50),
(1, '2026-01-10', 100);

-- Delay (Foundation delayed)
INSERT INTO Delay (Task_ID, Delay_Date, Delay_Days, Delay_Reason)
VALUES 
(1, '2026-01-12', 2, 'Rain delay');
SELECT * FROM Project;
SELECT * FROM Task;
ALTER TABLE Workers
CHANGE salary contact VARCHAR(15);
DESCRIBE Workers;

-- Complaint Registration Table
CREATE TABLE IF NOT EXISTS Complaint (
    Complaint_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Contact VARCHAR(15),
    Project_Name VARCHAR(100),
    Complaint_Type VARCHAR(100),
    Description TEXT NOT NULL,
    Status VARCHAR(50) DEFAULT 'Pending',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Registration Table
CREATE TABLE IF NOT EXISTS Agent (
    Agent_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15),
    Email VARCHAR(100),
    City VARCHAR(100),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Public User Registration Table
CREATE TABLE IF NOT EXISTS public_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(100)
);
