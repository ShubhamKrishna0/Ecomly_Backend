const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv/config');
const path = require('path'); // Importing path module
const authJwt = require('./middlewares/jwt');
const errorHandler = require('./middlewares/error_handler');

const app = express();
const env = process.env;
const API = env.API_URL;

app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(cors());
app.options('*', cors());
app.use(authJwt());
app.use(errorHandler);

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');

app.use(`${API}/`, authRouter);
app.use(`${API}/users`, usersRouter);
app.use(`${API}/admin`, adminRouter);
app.use('/public', express.static(path.join(__dirname, 'public'))); // Using path.join with __dirname

const hostname = env.HOST;
const port = env.PORT;

mongoose
  .connect(env.MONGODB_CONNECTION_STRING)
  .then(() => {
    console.log('Connected to Database');
  })
  .catch((error) => {
    console.error(error);
  });

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
