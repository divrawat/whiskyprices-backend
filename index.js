import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import  mongoose from "mongoose";

// Bringing Routes
import blogRoutes from "./routes/blog.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/category.js";
import tagRoutes from "./routes/tag.js";
import formRoutes from "./routes/form.js"


// import dotenv from "dotenv"
// dotenv.config()
import "dotenv/config.js";

// app
const app = express();
app.use(cors());


mongoose.set("strictQuery", true);
//DB Connection
mongoose
  .connect(process.env.DATABASE, {})
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB Error => ", err));



// middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());


// app.use(bodyParser.json({limit: '50mb'}));


app.use('/api', blogRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', categoryRoutes);
app.use('/api', tagRoutes);
app.use('/api', formRoutes);



// cors
if(process.env.NODE_ENV=== 'development'){
    app.use((cors({origin:`${process.env.CLIENT_URL}`})))
}


// routes
app.get('/', (req, res) => {
    res.json("Backend index");
});

// port
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});