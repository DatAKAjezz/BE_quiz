const express = require('express');
const mysql = require('mysql');
const db = require('./src/config/db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticationToken } = require('./src/middlewares/authMiddlewares');

const app = express();

app.use(cors());
app.use(express.json())

require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

// console.log(SECRET_KEY);

db.query('SHOW DATABASES;', (err, results) => {
  if (err) throw err;
  // console.log('Danh sách databases:', results);
  // results.forEach((table)  => {console.log(table)})
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?'
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.log('Error: ', err);
      return res.status(500).json({ success: false, message: 'Internal server error login' })
    }
    if (results.length > 0) {
      const token = jwt.sign({ id: results[0].id, username: results[0].username }, SECRET_KEY, { expiresIn: '1h' })
      // console.log(token);
      res.json({ success: true, token, message: 'Login successfully.' })
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
  })
})

app.post('/signup', (req, res) => {
  const { username, password } = req.body;

  const email = 'a@gmail.com';

  const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
  db.query(query, [username, password, email], (err, results) => {
    if (err) {
      console.log('Error: ', err);
      return res.status(500).json({ success: false, message: 'Internal server error during signup' });
    }
    res.json({ success: true, message: 'Sign up successfully.' });
  });
});

app.get('/dashboard', authenticationToken, (req, res) => {

  const username = req.user.username;

  const query = `SELECT * FROM 
                 users u JOIN user_introductions ui ON u.id = ui.user_id  
                 WHERE username = ? LIMIT 1`;
  db.query(query, [username], (err, results) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error when fetching user data'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: results
    });
  });
});

app.get('/flashcardsets/all', (req, res) => {
  const query = `select * from 
                 flashcard_sets fs
                 JOIN flashcards f ON f.set_id = fs.id`
  db.query(query, [], (err, results) => {
    if (err){
      res.json({success: false, message: 'Fetching all flashcard sets failed'})
      return;
    }
    res.json({success: true, data: results})
  })
})

app.get('/library/history', authenticationToken, (req, res) => {

  const id = req.user.id;
  console.log("USER ID: ", id);

  const query = `SELECT * from
                  users u 
                  JOIN study_history sh ON u.id = sh.user_id
                  JOIN flashcard_sets fs ON fs.id = sh.id
                  WHERE u.id = ?`

  db.query(query, [id], (err, results) => {
    if (err) {
      console.log('Error: ', err);
      return res.json({ success: false, message: 'Internal server error at /library' })
    }
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'History not found'
      });
    }
    console.log('History: ', results);
    res.json({
      success: true,
      data: results
    });
  })
})


app.get('/api/quizzes', (req, res) => {
  db.query('SELECT * FROM quizzes', (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Lỗi khi lấy dữ liệu' });
      return;
    }
    res.json(result);
  });
});

app.get('/api/contributions/:userId', (req, res) => {

  const userId = req.params.userId;
  // console.log('USER ID: ', userId);

  const query = `select *  from
                  users u JOIN contributions c ON u.id = c.user_id
                  where u.id = ?`

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.log('Error: ', err);
      res.json({ success: false, message: 'Error at contributions' })
      return;
    }

    res.json({ success: true, data: results })

  })

})

app.put('/modify/introduction', (req, res) => {

  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ success: false, message: 'User ID and message are required' });
  }

  const query = `update user_introductions set readme = ? where user_id = ?`

  db.query(query, [message, userId], (err, _) => {
    if (err) {
      res.json({ success: false, message: 'Error change user information.' })
      return;
    }
    res.json({ success: true, message: 'User infomations updated successfully.' })
  })
})

// app.get('/hello', (req, res) => {
//   console.log("hello")
//   res.status(500).json({message: 'hello'})
// })

app.listen(3001, () => {
  console.log('Server đang chạy tại http://localhost:3001');
})

