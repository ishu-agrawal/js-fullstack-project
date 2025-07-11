import express from 'express';
// require('dotenv').config({path: './env'});
import dotenv from 'dotenv'

/*  APPROACH - 1: using IIFE
import mongoose from 'mongoose';
import { DB_NAME } from './constants.js';
import express from 'express';

const app = express();

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on('error', (error) => {
            console.log('ERROR: ', error);
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on PORT ${process.env.PORT}`)
        })
    } catch (error) {
        console.log("Error: ", error);
        throw error;
    }
})();

*/


// APPROACH -2 : exporting DB conn
import { app } from './app.js';
import connectDB from './db/index.js';
dotenv.config({
    path: './env'
})

connectDB()
.then(() => {
    app.listen(process.env.POST || 3000, () => {
        console.log(`Server is running at port ${process.env.PORT}`)
    })
    app.on('error', (error) => {
        console.log('ERROR: ', error);
    })
})
.catch((error) => {
    console.log("MONGODB connection failed!!! ", error)
})