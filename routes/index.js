
/*
 * GET home page.
 */
 
var database = require("../models/DatabaseFunctions.js")

exports.index = function(req, res){
  res.render('dj', { title: 'DJ Stuff' });
};

exports.login = function(req, res) {
  res.render('login', { title: 'Login' });
};

exports.dj = function(req,res) {
	res.send('dj screen placeholder');
}

exports.postArtists = function(req, res){
	database.importData(req.body);
};
	
exports.queue = function(req, res){
	
};