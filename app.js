const express = require('express');
const mysql = require('mysql');
const db = require('./src/config/db');

const app = express();

db.query('SHOW DATABASES;', (err, results) => {
  if (err) throw err;
  console.log('Danh sách databases:', results);
  // results.forEach((table)  => {console.log(table)})
});

app.get('/api/quizzes', (req, res) => {
  db.query('SELECT * FROM quizzes', (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Lỗi khi lấy dữ liệu' });
      return;
    }
    res.json(result); 
  });
});

app.listen(3001, () => {
  console.log('Server đang chạy tại http://localhost:3001');
})

