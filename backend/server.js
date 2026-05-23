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
        db.query("SHOW COLUMNS FROM Builder LIKE 'Builder_Code'", (showErr, result) => {
            if (showErr) {
                console.log('Error checking Builder_Code column:', showErr);
                return;
            }
            if (!result.length) {
                db.query('ALTER TABLE Builder ADD COLUMN Builder_Code VARCHAR(20) UNIQUE', (alterErr) => {
                    if (alterErr) {
                        console.log('Error adding Builder_Code column:', alterErr);
                    } else {
                        console.log('Added Builder_Code column to Builder table');
                    }
                });
            }
        });
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

app.get('/track-status', async (req, res) => {
    const identifier = req.query.identifier;

    if (!identifier) {
        return res.status(400).json({ message: 'Project ID or email is required' });
    }

    const queryDb = (sql, params = []) => new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

    let projectQuery;
    if (/^\d+$/.test(identifier)) {
        projectQuery = 'SELECT p.Project_ID, p.Project_Code, p.Name, b.Name AS BuilderName, COALESCE(b.Builder_Code, CONCAT("AG", 100 + b.Builder_ID)) AS Agent_ID FROM Project p JOIN Builder b ON p.Builder_ID = b.Builder_ID WHERE p.Project_ID = ?';
    } else if (/^PRJ\d+$/i.test(identifier)) {
        projectQuery = 'SELECT p.Project_ID, p.Project_Code, p.Name, b.Name AS BuilderName, COALESCE(b.Builder_Code, CONCAT("AG", 100 + b.Builder_ID)) AS Agent_ID FROM Project p JOIN Builder b ON p.Builder_ID = b.Builder_ID WHERE p.Project_Code = ?';
    } else if (identifier.includes('@')) {
        projectQuery = 'SELECT p.Project_ID, p.Project_Code, p.Name, b.Name AS BuilderName, COALESCE(b.Builder_Code, CONCAT("AG", 100 + b.Builder_ID)) AS Agent_ID FROM Project p JOIN Builder b ON p.Builder_ID = b.Builder_ID WHERE LOWER(b.Email) = LOWER(?)';
    } else {
        return res.status(400).json({ message: 'Invalid Project ID format' });
    }

    try {
        const projects = await queryDb(projectQuery, [identifier]);

        if (!projects.length) {
            return res.status(404).json({ message: 'No project found for the given identifier' });
        }

        const projectIds = projects.map((project) => project.Project_ID);
        const projectNames = projects.map((project) => project.Name);

        const approvals = await queryDb(
            'SELECT * FROM Approval WHERE Project_ID IN (?)',
            [projectIds]
        );

        let progressResults = [];
        try {
            progressResults = await queryDb(
                `SELECT pp.Project_ID, pp.Status, pp.Stage_Name, pp.Actual_End
                 FROM project_progress pp
                 JOIN (
                   SELECT Project_ID, MAX(Progress_ID) AS maxId
                   FROM project_progress
                   WHERE Project_ID IN (?)
                   GROUP BY Project_ID
                 ) latest ON pp.Project_ID = latest.Project_ID AND pp.Progress_ID = latest.maxId`,
                [projectIds]
            );
        } catch (progressErr) {
            progressResults = [];
        }

        const delays = await queryDb(
            `SELECT t.Project_ID, COUNT(*) AS delayCount
             FROM Delay d
             JOIN Tasks t ON d.Task_ID = t.Task_ID
             WHERE t.Project_ID IN (?)
             GROUP BY t.Project_ID`,
            [projectIds]
        );

        console.log('Track status project query:', identifier, projectIds, projectNames);

        const complaints = await queryDb(
            'SELECT * FROM Complaint WHERE Project_Name = ?',
            [identifier]
        );

        console.log('Fetched complaints:', complaints.length, complaints.map(c => ({ id: c.Complaint_ID, project: c.Project_Name })));

        const approvalByProject = approvals.reduce((acc, approval) => {
            acc[approval.Project_ID] = approval;
            return acc;
        }, {});

        const progressByProject = progressResults.reduce((acc, progress) => {
            acc[progress.Project_ID] = progress;
            return acc;
        }, {});

        const delayByProject = delays.reduce((acc, delay) => {
            acc[delay.Project_ID] = delay.delayCount;
            return acc;
        }, {});

        const responseProjects = projects.map((project) => {
            const projectComplaints = complaints;
            const progress = progressByProject[project.Project_ID] || {};
            const rawStatus = progress.Status || 'Registered';
            const formattedStatus = rawStatus
                ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
                : 'Registered';

            return {
                Project_ID: project.Project_ID,
                Project_Code: project.Project_Code,
                Project_Name: project.Name,
                Builder_Name: project.BuilderName,
                Project_Status: formattedStatus,
                Actual_End_Date: progress.Actual_End || null,
                Delay_Status: delayByProject[project.Project_ID] > 0 ? `${delayByProject[project.Project_ID]} delay(s)` : 'On time',
                Complaint_Status: projectComplaints.length > 0 ? `${projectComplaints.length} complaint(s)` : 'No complaints found',
                complaints: projectComplaints.map((complaint) => ({
                    id: complaint.Complaint_ID,
                    type: complaint.Complaint_Type,
                    status: complaint.Status,
                    description: complaint.Description,
                    registeredDate: complaint.Created_At
                }))
            };
        });

        res.json({ projects: responseProjects });
    } catch (err) {
        console.log('Track status error:', err);
        res.status(500).json({ message: 'Server error while fetching project status' });
    }
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

  const lookupValue = builderId;
  const projectData = [
    null,
    req.body.name,
    req.body.location,
    req.body.budget,
    req.body.startDate,
    req.body.endDate
  ];

  db.query(
    'SELECT * FROM Builder WHERE Builder_ID = ? OR Builder_Code = ?',
    [lookupValue, lookupValue],
    (err, result) => {
      console.log('Agent lookup result:', result);
      if (err) {
        return res.status(500).send(err);
      }

      if (!result.length) {
        return res.status(400).json({
          message: 'Invalid Agent ID'
        });
      }

      const builderIdValue = result[0].Builder_ID;
      projectData[0] = builderIdValue;

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

          const projectCode = `PRJ${1000 + Number(result.insertId)}`;

          db.query(
            'UPDATE project SET Project_Code = ? WHERE Project_ID = ?',
            [projectCode, result.insertId],
            (updateErr) => {
              if (updateErr) {
                console.log(updateErr);
                return res.status(500).send(updateErr);
              }

              res.send({
                message: 'Project registered successfully',
                projectId: result.insertId,
                projectCode
              });
            }
          );
        }
      );
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
        SELECT Complaint_ID, Project_Name, Description, Status
        FROM complaint
        WHERE Complaint_Type = 'delay'
        ORDER BY Complaint_ID DESC
    `, (err, result) => {
        if (err) return res.send(err);
        res.send(result);
    });
});
app.get('/delay-count', (req, res) => {
    db.query(
        "SELECT COUNT(*) AS totalDelayed FROM project_progress WHERE Status = 'Delayed'",
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ totalDelayed: result[0].totalDelayed });
        }
    );
});
app.post('/add-complaint', (req, res) => {
    console.log(req.body);

    const sql = "INSERT INTO complaint (Name, Contact, Project_Name, Complaint_Type, Description, Status) VALUES (?, ?, ?, ?, ?, ?)";

    const values = [
        req.body.name,
        req.body.contact,
        req.body.project,
        req.body.type,
        req.body.description,
        'Pending'
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Database insert failed' });
        }

        return res.status(200).json({
            message: 'Complaint registered successfully'
        });
    });
});
app.get('/complaints', (req, res) => {
    db.query('SELECT * FROM Complaint ORDER BY Created_At DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});
app.post('/update-complaint-status', (req, res) => {
    const { complaintId, status } = req.body;

    if (!complaintId || !status) {
        return res.status(400).json({ message: 'Missing complaint ID or status' });
    }

    const sql = 'UPDATE Complaint SET Status = ? WHERE Complaint_ID = ?';
    db.query(sql, [status, complaintId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Failed to update complaint status' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json({ message: 'Complaint status updated successfully' });
    });
});
app.get('/complaint-count', (req, res) => {
    db.query(
        'SELECT COUNT(*) AS totalComplaints FROM Complaint',
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ totalComplaints: result[0].totalComplaints });
        }
    );
});
app.post('/add-builder', (req, res) => {

  const { name, contact, email } = req.body;

  const sql = `
    INSERT INTO Builder (Name, Contact, Email)
    VALUES (?, ?, ?)
  `;

  const values = [name, contact, email];

  db.query(sql, values, (err, result) => {
    console.log(err);
    console.log(result);

    if (err) {
      return res.status(500).send(err);
    }

    const agentCode = `AG${100 + Number(result.insertId)}`;

    db.query(
      'UPDATE Builder SET Builder_Code = ? WHERE Builder_ID = ?',
      [agentCode, result.insertId],
      (updateErr) => {
        if (updateErr) {
          console.log(updateErr);
          return res.status(500).send(updateErr);
        }

        res.send({
          success: true,
          message: 'Builder registered successfully',
          builderId: result.insertId,
          agentId: agentCode
        });
      }
    );
  });
});
app.get('/agents', (req, res) => {
    db.query('SELECT * FROM Agent ORDER BY Created_At DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});
app.get('/builders', (req, res) => {
    db.query("SELECT COALESCE(Builder_Code, CONCAT('AG', 100 + Builder_ID)) AS Agent_ID, Name, Contact, Email FROM Builder", (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});
app.post('/update-progress', (req, res) => {
    const { projectIdentifier, actualEndDate, status } = req.body;
    const identifier = projectIdentifier ? projectIdentifier.trim() : '';

    if (!identifier || !actualEndDate || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    let sql;
    let params;
    if (/^PRJ\d+$/i.test(identifier)) {
        sql = `
            INSERT INTO project_progress (Project_ID, Actual_End, Status, Stage_Name)
            SELECT Project_ID, ?, ?, ?
            FROM Project
            WHERE Project_Code = ?
        `;
        params = [actualEndDate, status, 'General', identifier];
    } else if (/^\d+$/.test(identifier)) {
        sql = `
            INSERT INTO project_progress (Project_ID, Actual_End, Status, Stage_Name)
            SELECT Project_ID, ?, ?, ?
            FROM Project
            WHERE Project_ID = ?
        `;
        params = [actualEndDate, status, 'General', identifier];
    } else if (identifier.includes('@')) {
        sql = `
            INSERT INTO project_progress (Project_ID, Actual_End, Status, Stage_Name)
            SELECT p.Project_ID, ?, ?, ?
            FROM Project p
            JOIN Builder b ON p.Builder_ID = b.Builder_ID
            WHERE LOWER(b.Email) = LOWER(?)
        `;
        params = [actualEndDate, status, 'General', identifier];
    } else {
        return res.status(400).json({ message: 'Invalid Project Identifier format' });
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Failed to save project progress' });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project progress saved successfully' });
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
app.post('/public-register', (req, res) => {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    db.query('SELECT id FROM public_users WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Server error' });
        }

        if (result.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const sql = `
            INSERT INTO public_users (full_name, email, phone, password)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [fullName, email, phone, password], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json({ message: 'Registration successful' });
        });
    });
});
app.post('/public-login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const sql = `
        SELECT id, full_name, email FROM public_users
        WHERE email = ? AND password = ?
    `;

    db.query(sql, [email, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Server error' });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({ message: 'Login successful', user: result[0] });
    });
});
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
