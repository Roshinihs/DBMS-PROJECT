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
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
