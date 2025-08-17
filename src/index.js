const dotenv = require("dotenv");
dotenv.config();
const app = require("./app");
const http = require('http');
const socket = require("socket.io");
const Filter = require("bad-words");

const { MongoClient } = require("mongodb");
const {generateMessage,generateLocationMessage} = require("../src/util/generateMessage");
const {addUser,removeUser,getUser,getUserInRoom,getAllRooms} = require("../src/util/user");


const uri = process.env.MONGO_URI; 
const client = new MongoClient(uri);

let db=null;

async function connectDB() {
  await client.connect();
  db = client.db("SarasCare"); // your DB name
  if(!db) {
    console.error("❌ MongoDB connection failed");
    return;
  }
  console.log("✅ MongoDB connected");
}



const server = http.createServer(app);
const io = socket(server);

const port = process.env.PORT || 8000;

io.on("connection",(socket) => {
    console.log("connected !")
    
    io.emit("getAllRooms",getAllRooms());

    socket.on("join",(username,room,callback) => {
        
        const {error,user} = addUser({id:socket.id,username,room});

        if(error){
           return callback(error);
        }

        socket.join(user.room);
        socket.emit("message",generateMessage("SarasCare","Welcome to our chat Application !"));
        socket.broadcast.to(user.room).emit("message",generateMessage(user.username,` ${user.username} Is Joined !`));
        
        io.to(user.room).emit("getAlllUser",{
            room:user.room,
            users:getUserInRoom(user.room)
        });
    });

    socket.on("sendMessage",(msg,callback) => {
        const user = getUser(socket.id);

        const filter = new Filter();
        
        if(filter.isProfane(msg)){
            callback("Not Valid Input !");
        }

        io.to(user.room).emit("message",generateMessage(user.username,msg));
        callback();
    });

    socket.on("sendLocation",(data,callback) =>{
        const user = getUser(socket.id);

        io.to(user.room).emit("locationMessage",generateLocationMessage(user.username,`https://google.com/maps?q=${data.latitude},${data.longitude}`))
        callback();
    });

    socket.on('disconnect',() => {
        const user = removeUser(socket.id);
        
        if(user){
            io.to(user.room).emit("message",generateMessage(user.username,`${user.username} is left !`))
        }
    });
   
});


connectDB();
// API route to return emails
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.collection("ProjectTeam_Users").find({}, { projection: { UserEmail: 1, _id: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

server.listen(port,(err) => {
    if(err){return err;}
    console.log(`Listening on port ${port}`);
});