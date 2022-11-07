var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const catalogRouter = require("./routes/catalog");


var app = express();

// Mongoose stuff
const mongoose = require('mongoose');
const mongoDB = "mongodb+srv://brandon:terminal@cluster0.btl9b9w.mongodb.net/local_library?retryWrites=true&w=majority"
mongoose.connect(mongoDB, { useNewUrlParser: true,
useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error: "));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// middleware ------------------------------------------
app.use(logger('dev'));

// .json and .urlencoded needed to populate req.body with the form fields
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

// Server all the stat files in the /public directory.
app.use(express.static(path.join(__dirname, 'public')));
// -----------------------------------------------------

// Route handlers
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter);

// catch 404 and forward to error
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Allows app.js to be imported by /bin/www.
module.exports = app;
