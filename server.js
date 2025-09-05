const express = require('express');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = 3000;

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '11March1999$',
  database: 'school'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use express-session to manage user sessions
app.use(session({
  secret: 'secretkey',  // Use a secure secret key
  resave: false,
  saveUninitialized: true
}));

// Serve static files (HTML pages)
app.use(express.static(path.join(__dirname, 'public')));

// Default route to redirect to signup page
app.get('/', (req, res) => {
  res.redirect('/signup');
});

// Signup route to display signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Login route to display login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    console.log('⚠️  Unauthorized access attempt to /dashboard');
    return res.redirect('/login'); // If the user is not logged in, redirect them to the login page
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve the dashboard page
});

// Route to check if the user is authenticated
app.get('/dashboard-check', (req, res) => {
  if (req.session.user) {
    res.status(200).send('Authorized');
  } else {
    res.status(401).send('Unauthorized');
  }
});

// Signup logic
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length > 0) return res.status(409).send('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], err => {
      if (err) return res.status(500).send('Error registering user');
      res.redirect('/login'); // Redirect to login after successful signup
    });
  });
});

// Login logic
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(401).send('Invalid credentials');

    const hashedPassword = results[0].password;
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      if (err) return res.status(500).send('Error comparing passwords');
      if (!isMatch) return res.status(401).send('Incorrect password');

      // Save user info to the session
      req.session.user = { username: results[0].username };

      console.log('Session User:', req.session.user);  // Debug the session object

      res.redirect('/dashboard'); // Redirect to dashboard after login success
    });
  });
});

// Logout logic
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Error logging out');
    res.redirect('/login');
  });
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
app.get('/terms-and-conditions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

const upload = multer({ storage });

// File upload logic
app.post('/upload', upload.single('assignment'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  console.log('✅ File uploaded:', req.file.filename);
  res.redirect('/dashboard');
});


// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
