const dotenv = require("dotenv");
dotenv.config();
const app = require("./app");
const http = require('http');

const multer = require("multer");
const path = require("path");
// const fs = require("fs");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLD_NAME,   // from dashboard
  api_key: process.env.CLD_API_KEY,         // from dashboard
  api_secret: process.env.CLD_API_SECRET_KEY,   // from dashboard
});
//const router = express.Router();

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
    console.error("MongoDB connection failed❌ !");
    return;
  }
  console.log("MongoDB connected ✅!");
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
// API route to return users data
app.get("/api/usersdata", async (req, res) => {
  try {
    const collection = db.collection("ProjectTeam_Users");
    const users = await collection.find({}).toArray();

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/updatedb
app.post("/api/updatedb", async (req, res) => {
  try {
    const { email, datetime, action } = req.body;

    if (!email || !datetime || !action) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const collection = db.collection("ProjectTeam_Users");

    // Example update: push activity into a new field "Logs"
    const result = await collection.updateOne(
      { UserEmail: email },
      {
        $push: {
          Logs: { action, datetime }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // res.json({ success: true, modifiedCount: result.modifiedCount });
    res.json({ success: true});
  } catch (err) {
    console.error("Error updating DB:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Directory to save uploaded images
// const uploadDir = path.join(__dirname, "imgs_uploads"); // inside src folder
// if (!fs.existsSync(uploadDir))
// {fs.mkdirSync(uploadDir, { recursive: true });}

// Configure multer storage
// Basic storage first
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     // temporary name
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });


const upload = multer();

// POST endpoint to save image
app.post("/user-verification", upload.single("photo"), (req, res) => {
 
  if (!req.file) 
  {return res.status(400).json({ error: "No file uploaded" });}
 
  const buffer = req.file.buffer;

  console.log("Email:", req.body.email);
  console.log("Action:", req.body.action);
  console.log("Datetime:", req.body.datetime);
  // console.log("File saved at:", req.file.path);

 


  const { email, action, datetime } = req.body;
  const ext = path.extname(req.file.originalname);
  const safeEmail = (email || "unknown").replace(/[@.]/g, "-");
  const finalName = `${safeEmail}_${action || "unknown"}_${datetime || Date.now()}${ext}`;

  console.log("Final file name:", finalName);

    let cld_upload_stream = cloudinary.uploader.upload_stream(
    { folder: 'users_attendance_uploads', public_id: finalName },
   (error, result) => {
      if (error){ return res.status(500).json({ error: error.message });}
      else{res.json({ message: 'Uploaded successfully', url: result.secure_url });}
    });
  
    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
    

  // Rename file
  // const oldPath = req.file.path;
  // const newPath = path.join(uploadDir, finalName);
  // fs.renameSync(oldPath, newPath);

  // console.log("File saved renamed as:", finalName);

  // Optional: update MongoDB here using req.file.path if needed

  //res.json({ success: true, file: req.file.path });
});

server.listen(port,(err) => {
    if(err){return err;}
    console.log(`Listening on port ${port}`);
});