var Express = require('express')
var app = new Express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var cors = require('cors')
var Log = require('log')
var log = new Log('debug')
var port = process.env.PORT || 5000
var path = require('path');
var bodyParser = require("body-parser");
var mysql = require('mysql')
var omise = require('omise')({
  'secretKey': 'skey_test_591fmr4z2h1760knf8v',
  'omiseVersion': '2015-09-10'
});
var mysqlPool = mysql.createPool({
    host     : 'xxx.xxx.xxx.xxx',
    user     : 'root',
    password : 'xxx',
    database : 'tutordb'
});


app.use(bodyParser.urlencoded({
    extended: false
}));
// app.use(bodyParser.json());
app.use(cors())
// app.use(Express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
  res.send(`<h1>555 Hello Vue.js 2 socket. io </h1> <br> <li> yarn add socket </li> <li> function socket.io  </li>`)
//   res.redirect('index.html')
})
app.get('/payment', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});
app.post('/checkout/:course_id/:branch_id/:user_id/:ts', function(req, res ,next) {
  var token = req.body.omiseToken
  var course_id = req.params.course_id
  var branch_id = req.params.branch_id
  var user_id = req.params.user_id
  var purchase_ts = req.params.ts
  
  console.log(course_id + " " + branch_id +" " +user_id+" "+ purchase_ts );
  console.log(req.body)
  
    omise.charges.create({
    'amount': '10025', // 10 Baht
    'currency': 'thb',    
    'card': token
  }, function(err, resp) {
    if (resp.paid) {
      //Success
      res.send('success')
	  
	let data = {
		  user_id: user_id,
		  course_id: course_id,
		  branch_id: branch_id,
		  purchase_ts:purchase_ts
		  
	  }
		io.to(user_id).emit('purchase', data)	  
	mysqlPool.getConnection(function(err, connection) {
	  if(err) throw err;

	  var query = "INSERT INTO `user_purchase`(`course_id`, `branch_id`, `user_id`, `purchase_ts`) VALUES ("+course_id+","+branch_id+","+user_id+",'"+purchase_ts+"')"
	  connection.query(query);

	})
	
	
    } else {
      //Handle failure
      res.send('fail' + err)
      throw resp.failure_code;
    }
  });
})


// io.on('connection', function (socket) {
//   socket.on('stream', function (image) {
//     socket.broadcast.emit('stream', image)
//   })
// })
// บ่งบอกสถานะคนที่เข้ามาใช้งาน โดยจะมีหมายเลข socket.id เเตกต่างกันครับ
io.on('connection', function (socket) {
  console.log('a user connected ', socket.id)
  // user ที่เปิดหรืออก browser
  socket.on('disconnect', function () {
    console.log('user disconnected ', socket.id)
  })
  socket.on('subscribe', function(room) {
    console.log('joining room', room);
    socket.join(room);
  });
  socket.on('leaveRoom',function(room){
    console.log('leave Room', room);
    socket.leave(room)
  });
  socket.on('private_message',function(data){
    console.log("send from room: " + data.room);
    io.to(data.room).emit('conversation_private', data);
    io.emit('admin', data)
  });
  socket.on('toUser',function(data){
      data.type = "admin"
      io.to(data.room).emit('fromAdmin', data)
  })
  socket.on('addNewCourse' ,function(data){
    console.log('addNewCourse: ' + data)
      io.emit('newCardData',data)
  })
  socket.on('removeCourse' ,function(data){
    console.log('removeCourse: ' + data)
      io.emit('removeCourse',data)
  })

  // รับเฉพาะ Event ข้อความ จาก client
  socket.on('chat_message', function (msg) {
    console.log('socket by : ', socket.id, ' message: ' + msg)
    // ส่งข้อมูลกลับไปหาผู้ส่งมา
    io.emit('chat_message', msg)
  })
})

http.listen(port, function () {
  log.info('Run Port // localhost:', port)
})
