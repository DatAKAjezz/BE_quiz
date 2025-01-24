const express = require('express');
const mysql = require('mysql2/promise');
const pool = require('./src/config/db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticationToken } = require('./src/middlewares/authMiddlewares');
const upload = require('./src/config/multerConfig');
const path = require("path");
const fetchAllFlashCardsAndAnswers = require('./src/helpers/helpers');
const { Server } = require('socket.io')
const http = require('http');

const app = express();

app.use(cors());
app.use(express.json())
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const server = http.createServer(app);
const io = new Server(server);

require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

(async () => {
  try {
    const [databases] = await pool.query('SHOW DATABASES;');
    // console.log('Databases:', databases);
  } catch (err) {
    console.error('Error fetching databases:', err);
  }
})();

app.get('/', (req, res) => {
  res.json({ message: 'Sup!?' })
})

// MARK: image upload
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.body;
    const imagePath = `/uploads/${req.file.filename}`
    const query = 'UPDATE users SET image_path = ? WHERE id = ?'

    await pool.execute(query, [imagePath, userId]);
    res.status(200).json({ message: 'Image uploaded', path: imagePath })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
});

app.get("/images/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = 'SELECT * FROM users WHERE id = ? LIMIT 1'
    const [result] = await pool.execute(query, [userId]);
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?'
  
  try {
    const [results] = await pool.execute(query, [username, password]);
    
    if (results.length > 0) {
      const token = jwt.sign({ id: results[0].id, username: results[0].username }, SECRET_KEY, { expiresIn: '1h' })
      res.json({ success: true, token, message: 'Login successfully.' })
    } else {
      res.json({ success: false, message: 'Invalid credentials' })
    }
  } catch (err) {
    console.log('Error: ', err);
    res.status(500).json({ success: false, message: 'Internal server error login' })
  }
})

app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const email = 'a@gmail.com';
    const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
    
    await pool.execute(query, [username, password, email]);
    res.json({ success: true, message: 'Sign up successfully.' });
  } catch (err) {
    console.log('Error: ', err);
    res.status(500).json({ success: false, message: 'Internal server error during signup' });
  }
});

app.get('/dashboard', authenticationToken, async (req, res) => {
  try {
    const username = req.user.username;
    const query = `SELECT u.id AS user_id, 
                          u.firstname,
                          u.lastname,
                          u.username, 
                          u.email, 
                          u.role, 
                          u.avatar_url, 
                          ui.id AS intro_id, 
                          ui.readme, 
                          ui.address, 
                          ui.social_link 
                          FROM 
                              users u 
                          LEFT JOIN 
                              user_introductions ui 
                          ON 
                              u.id = ui.user_id 
                          WHERE 
                              u.username = ?
                          LIMIT 1`

    const [results] = await pool.execute(query, [username]);

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
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).json({
      success: false,
      message: 'Internal server error when fetching user data'
    });
  }
});

app.get('/flashcardsets/all', async (req, res) => {
  try {
    const query = `SELECT * FROM flashcard_sets fs JOIN flashcards f ON f.set_id = fs.id`
    const [results] = await pool.execute(query);
    res.json({ success: true, data: results })
  } catch (err) {
    res.json({ success: false, message: 'Fetching all flashcard sets failed' })
  }
});

app.get('/library/history', authenticationToken, async (req, res) => {
  try {
    const id = req.user.id;
    const query = 'SELECT * FROM users u JOIN study_history sh ON u.id = sh.user_id JOIN flashcard_sets fs ON fs.id = sh.id WHERE u.id = ?'
    const [results] = await pool.execute(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'History not found'
      });
    }
    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    console.log('Error: ', err);
    res.json({ success: false, message: 'Internal server error at /library' })
  }
});


app.get('/api/quizzes', async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT * FROM quizzes');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lấy dữ liệu' });
  }
});

app.get('/api/contributions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = 'SELECT * FROM users u JOIN contributions c ON u.id = c.user_id WHERE u.id = ?'
    const [results] = await pool.execute(query, [userId]);
    res.json({ success: true, data: results })
  } catch (err) {
    console.log('Error: ', err);
    res.json({ success: false, message: 'Error at contributions' })
  }
});

app.get('/api/user-info/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = `SELECT username, password, email, role, created_at, firstname, lastname, image_path
                   FROM users WHERE id = ? LIMIT 1`
    const [results] = await pool.execute(query, [userId]);
    res.json({ success: true, data: results[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error fetching user info' });
  }
});

app.put('/modify/introduction', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'User ID and message are required' });
    }

    const query = 'UPDATE user_introductions SET readme = ? WHERE user_id = ?'
    await pool.execute(query, [message, userId]);
    res.json({ success: true, message: 'User informations updated successfully.' })
  } catch (err) {
    res.json({ success: false, message: 'Error changing user information.' })
  }
});

const checkDatabase = async (userId, setId, callback) => {
  try {
    const [rows, fields] = await pool.execute('SELECT * FROM liked_sets WHERE user_id = ? AND set_id = ?', [userId, setId]);
    console.log("Rows: ", rows);
    if (rows.length > 0) {

      callback(true);
      return;
    }
    else {
      callback(false);
    }
  } catch (err) {
    console.error("Error: ", err);
  }
}


app.get('/api/liked/check/:userId/:setId', async (req, res) => {
  console.log("Checking...")
  const { userId, setId } = req.params;
  checkDatabase(userId, setId, (exists) => {
    if (exists) {
      res.json({ exists: true, message: "Already liked" })
    }
    else {
      res.json({ exists: false, message: "Not liked yet" })
    }
  });
})

app.put('/api/liked/add', async (req, res) => {
  const { userId, setId } = req.body;
  console.log("Adding... " + userId + " " + setId);

  checkDatabase(userId, setId, async (exists) => {
    if (exists) {
      try {
        console.log("Removed from liked sets.");
        const [rows, fields] = await pool.execute("DELETE FROM liked_sets WHERE user_id = ? AND set_id = ?", [userId, setId])
        res.json({ success: true, message: "UnLiked." })
      }
      catch (error) {
        console.log("Error: ", error);
      }
    }
    else {
      const query = 'INSERT INTO liked_sets (user_id, set_id) values (? , ?)'
      pool.query(query, [Number(userId), Number(setId)], (err, result) => {
        if (err) {
          res.status(500).json({ success: false, message: "Internal server error" })
          return;
        }
        console.log("Add to liked set!")
        res.json({ success: true, message: "Liked!" })
      })
    }
  });

})



app.get('/api/save/card', async (req, res) => {
  try {
    const cardId = req.body;
    if (!cardId) {
      return res.status(400).json({ success: false, message: 'Card ID is required' })
    }

    const query = 'UPDATE flashcards SET learned = true WHERE id = ?'
    await pool.execute(query, [cardId]);
    res.json({ success: true, message: "Card updated successfully" })
  } catch (err) {
    console.log("Error when update card: ", err);
    res.json({ success: false, message: "Card updated failed" })
  }
});

app.get('/api/getall/:setId', async (req, res) => {
  try {
      const setId = req.params.setId;
      if (!setId) {
          return res.status(400).json({ success: false, message: 'Set ID is required.' })
      }
      
      const response = await fetchAllFlashCardsAndAnswers(setId);
      
      if (!response.success) {
          return res.status(500).json({ success: false, message: "Failed to fetch cards" })
      }
      
      res.json({ success: true, data: response.data })
  } catch (err) {
      res.status(500).json({ success: false, message: "Error: " + err })
  }
})

app.listen(3001, () => {
  console.log('Server đang chạy tại http://localhost:3001');
})