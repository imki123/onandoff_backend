const app = require('express')()
const favicon = require('express-favicon')
const http = require('http').createServer(app)
const io = require('socket.io')(http)

//favicon 추가하기
app.use(favicon(__dirname + '/client/favicon.ico'))

//open client index
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/client/index.html')
})

//make io
//io.origins(['http://localhost:4000','https://socket-imki123.herokuapp.com/'])
io.origins((origin, callback) => {
	if (origin !== 'http://localhost:4000' && origin !== 'https://socket-imki123.herokuapp.com') {
		return callback(origin, 'origin not allowed', false)
	}
	callback(null, true)
})

const msgs = []
const allClients = []

io.on('connection', (socket) => {
	//접속 시 접속자 수 증가
	let address = socket.handshake.address //get IP
	let splited = address.split('.')
	address = address === '::1' ? 'admin' : `guest(.${splited[2]}.${splited[3]})`

	allClients.push({socket, address})
	io.emit('allClients', {num: allClients.length})

	//접속해제 시 접속자 수 감소
	socket.on('disconnect', function () {
		console.log('Got disconnect!')
		let num = allClients.length
		let client
		allClients.filter((i, idx) => {
			if(i.socket === socket){
				client = idx
				return true
			}else return false
			
		})
		let clientAddress
		if(client !== undefined) {
			clientAddress = allClients.splice(client, 1)[0].address
		}
		console.log(clientAddress, allClients.length)
		socket.broadcast.emit('allClients', {address: clientAddress, num: allClients.length})
	})

	

	//접속한 사람에게 저장된 메시지를 방출(emit), 인사문구
	io.to(socket.id).emit('get msgs', msgs)
	io.to(socket.id).emit('new connect', `${address}님 환영합니다 :D`)

	//나를 제외한 전체에게 접속한 사람 address를 방출
	socket.broadcast.emit('new connect', `${address}님이 접속하셨습니다.`)

	//메시지 입력 받으면 메시지를 msgs에 저장하고 입력 받은 메시지를 방출(emit)
	socket.on('chat message', (msg) => {
		let date = new Date()
		let time = date.getFullYear()
		time += date.getMonth() < 10 ? '/0' + date.getMonth() : '/' + date.getMonth()
		time += date.getDate() < 10 ? '/0' + date.getDate() : '/' + date.getDate()
		time += date.getHours() < 10 ? ' 0' + date.getHours() : ' ' + date.getHours()
		time += date.getMinutes() < 10 ? ':0' + date.getMinutes() : ':' + date.getMinutes()
		msgs.push({ address, msg, time }) //msgs에 메시지들 저장
		io.emit('chat message', { address, msg, time })
	})
})

//open Server
const port = process.env.PORT || 4000
http.listen(port, () => {
	console.log(`Listening on port: ${port}\nConnect to http://localhost:${port}`)
})
