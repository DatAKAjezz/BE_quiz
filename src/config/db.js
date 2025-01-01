const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',     
  user: 'datdat',            
  password: '',            
  database: 'quiz_app'    
});

connection.connect((err) => {
  if (err) {
    console.error('Kết nối thất bại: ' + err.stack);
    return;
  }
  console.log('Đã kết nối MySQL với ID: ' + connection.threadId);
}); 

module.exports = connection;
