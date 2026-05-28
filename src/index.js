import dotenv  from "dotenv" 
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: '/.env'
})

// this is a aync method , so it returs a promise to us 
connectDB()
.then( () => {
    app.on("error" , (error) => {
            console.log("ERROR: " , error) ; 
            throw error ; 
        }) 
    app.listen(process.env.PORT || 8000 , () =>{
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch( (err) => {
    console.log("MONGODB Connection failed !!!" , err);
})

/*
2nd way to connect the DB using IIFE 
import express from "express";
const app = express() ; 

// iife function , -> used to execute the function immediately 
;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error" , (error) => {
            console.log("ERROR: " , error) ; 
            throw error ; 
        })
        app.listen(process.env.PORT , () => {
            console.log(`App is listening on port ${process.env.PORT}`) ; 

        })
    } catch (error) {
        console.error("Error: " , error) ; 
        throw err  ;
    }
})()

*/