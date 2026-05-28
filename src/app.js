import express from "express"
import cors from "cors"
import cookieParser from 'cookie-parser'

const app = express() ; 

app.use(cors({
    origin: process.env.CORS_ORIGIN , 
    credentials: true , 
}))

// Accepting json data 
app.use(express.json({limit:"16kb"}));
// Accepting data from url
app.use(express.urlencoded( {extended:true , limit: "16kb"} ));
// some public assets , sometimes to store the files on server 
app.use(express.static("public"))
app.use(cookieParser());


//  Routes Import
import userRouter from './routes/user.routes.js'


//  Routes Declaration
app.use("/api/v1/users" , userRouter)

// Example router - https://localhost:8000/api/v1/user/register
export { app } ; 