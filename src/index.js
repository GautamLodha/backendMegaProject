import dotenv from "dotenv";
dotenv.config({ path: './env' });
import connectDB from "./db/index.js";
import { app } from "./app.js";
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server running at port ${process.env.PORT} `);
        
    })
})
.catch((error)=>{
    console.log(`MONGODB connection error : ${error} `);
})





/*
import express from 'express'
const app = express()
(async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on("error",(error)=>{
        console.log("ERR",error);
        throw error
       })
       app.listen(process.env.PORT,()=>{
        console.log(`server running at PORT ${process.env.PORT} `);
        
       })
    } catch (error) {
        console.log("ERROR : ",error);
        throw error 
    }
})()
*/    
