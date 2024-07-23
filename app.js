//https://chatgpt.com/share/f5f55932-26fe-4666-a454-a3aac077a659

const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv/config');

const app = express();
const env = process.env;
const API = env.API_URL;


// middleware
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(cors());
app.options('*', cors());

const authRouter = require('./routes/auth');

app.use(`${API}/`,authRouter)



const hostname = env.HOST;
const port = env.PORT;

//dataBase

mongoose
    .connect(env.MONGODB_CONNECTION_STRING)
    .then(() => {
    console.log('connected to Database');
    })
    .catch((error) => {
    console.error(error);
});


app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});
