
/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , mongoose = require('mongoose');

mongoose.connect(process.env.MONGOHQ_URL || "mongodb://localhost/test");

var database = require('./models/DatabaseConfig');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("We've opened the floor gates to DATA");
});

var app = express();

passport.use(new LocalStrategy(
  function(username, password, done) {
    mongoose.model('User').findOne({ username: username, password: password}, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.password == password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  mongoose.model('User').findById(id, function(err, user) {
    done(err, user);
  });
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

app.get('/users', user.list);
app.get('/login', routes.login);
app.get('/dj', ensureAuthenticated, function(req, res) {
  var req = req;
  var res = res;
  console.log(req.user);
  mongoose.model('User').findOne({username: req.user.username}, function(err, user) {
    if (err) res.redirect('/login');
    mongoose.model('Lounge').findOne({user: user.id}, function(err, lounge) {
      if (err) res.redirect('/login');
      if (lounge) {
        routes.dj(req,res);
      }
      else {
        routes.newLounge(req,res);
      }
    })
  })

 //res.send("no valid user");
});
app.get('/register', routes.register);
app.get('/', ensureAuthenticated, routes.index );
app.post('/login', passport.authenticate('local', {successRedirect: '/dj', failureRedirect: '/login'}));
app.post('/postArtists', routes.postArtists);
app.post('/register', routes.createUser);
app.get('/createLounge', routes.newLounge);
app.post('/createLounge', routes.createLounge);
app.post('/queryLounges', routes.queryLounges);
app.post('/registerGCM', routes.registerGCM);
app.get('/nextSong', routes.nextSong);
app.post('/vote', routes.vote);
app.post('/queryLounge', routes.queryLounge);
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
