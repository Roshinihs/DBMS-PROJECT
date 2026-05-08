const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Prar_#lov3&^cod!ng06', // replace this
    database: 'construction_db'
});

db.connect(err => {
    if (err) {
        console.log('DB connection error:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

app.get('/', (req, res) => {
    res.send('Backend running');
});
app.get('/projects', (req, res) => {
    db.query('SELECT * FROM Project', (err, result) => {
        if (err) {
            res.send(err);
        } else {
            res.send(result);
        }
    });
});
app.post('/add-project', (req, res) => {

  const {
    builderId,
    name,
    location,
    budget,
    startDate,
    endDate
  } = req.body;

  const projectData = [
  1,
  name,
  location,
  budget,
  startDate,
  endDate
];

  const sql = `
    INSERT INTO project
    (Builder_ID, Name, Location, Budget, Start_Date, End_Date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  console.log(projectData);

  db.query(
    sql,
    projectData,
    (err, result) => {
        console.log(err);

      if (err) {
        return res.status(500).send(err);
      }

      res.send({
        message: 'Project registered successfully',
        projectId: result.insertId
      });

    }
  );

});
app.get('/approvals', (req, res) => {
    db.query('SELECT * FROM Approval', (err, result) => {
        if (err) return res.send(err);
        res.send(result);
    });
});
app.get('/tasks', (req, res) => {
    db.query('SELECT * FROM Tasks', (err, result) => {
        if (err) return res.send(err);
        res.send(result);
    });
});
app.get('/delays', (req, res) => {
    db.query('SELECT * FROM Delay', (err, result) => {
        if (err) return res.send(err);
        res.send(result);
    });
});
app.get('/delayed-tasks', (req, res) => {
    db.query(`
        SELECT Task_Name, Planned_End_Date, Actual_End_Date
        FROM Tasks
        WHERE Actual_End_Date > Planned_End_Date
    `, (err, result) => {
        if (err) return res.send(err);
        res.send(result);
    });
});
app.post('/add-complaint', (req, res) => {
    const { name, contact, projectName, complaintType, description } = req.body;

    const sql = `
        INSERT INTO Complaint (Name, Contact, Project_Name, Complaint_Type, Description)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [name, contact, projectName, complaintType, description], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Complaint registered successfully', complaintId: result.insertId });
    });
});
app.get('/complaints', (req, res) => {
    db.query('SELECT * FROM Complaint ORDER BY Created_At DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});
app.post('/add-agent', (req, res) => {

  const { name, contact, email, area } = req.body;

  const sql = `
    INSERT INTO agent
    (Name, Phone, Email, City)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, contact, email, area],
    (err, result) => {

      console.log(err);

      if (err) {
        return res.status(500).send(err);
      }

      res.send({
        success: true,
        message: 'Agent registered successfully'
      });

    }
  );

});
app.get('/agents', (req, res) => {
    db.query('SELECT * FROM Agent ORDER BY Created_At DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});
app.post('/admin-login', (req, res) => {

  const { username, password } = req.body;

  const sql = `
    SELECT * FROM admin
    WHERE Username = ? AND Password = ?
  `;

  db.query(
    sql,
    [username, password],
    (err, result) => {

      if (err) {
        return res.status(500).send(err);
      }

      if (result.length > 0) {

        res.send({
          success: true,
          message: 'Login successful'
        });

      } else {

        res.send({
          success: false,
          message: 'Invalid username or password'
        });

      }

    }
  );

});
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
