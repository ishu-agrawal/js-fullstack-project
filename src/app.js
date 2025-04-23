import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'})) // limit to accept the uploaded file / payload
app.use(express.urlencoded({extended: true, limit: '16kb'})) // to read encoded url
app.use(express.static('public')) // to keep all static files like imgs in public folder
app.use(cookieParser()) // to perform CRUD on cookies
export { app };