var mongoose = require('mongoose');
var request = require('request');
var musicAlgorithm = require('../models/MusicAlgorithm.js');

var Lounge = mongoose.model('Lounge');
var User = mongoose.model('User')

var MAX_QUEUE_ITEMS = 5;

exports.importData = function (jsonArtists, loungeId, genId) {
	var getTopTracks = "http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=";
	var getAPIKey = "&autocorrect=1&api_key=7f989465f20cc96c5bdc96f18dea2ad5&format=json";
	console.log("ID!!!!", loungeId)
	Lounge.findById(loungeId, function(err, lounge) {
		console.log("GENID", genId)
		mongoose.model('Device').find({genId: genId}, function(err, device) {
			if (err) return
			if (!lounge.devIds)
				lounge.devIds = [];
			lounge.devIds.push({genId: genId, regId: device.regId});
			lounge.save();
		});
		

		if (err) return
		var loungeArtists = lounge.artists;
					
		for(var i = 0; i < jsonArtists.length; i++) {
			var artistExists = false;
			var artist = jsonArtists[i];
			var getCorrection = getTopTracks + artist + getAPIKey;
			request(getCorrection, function (error, response, body) {
				var tracks = JSON.parse(body).toptracks.track;
				if (!error && response.statusCode == 200) {
					var correctedName = tracks[0].artist.name;
					var duplicate = false;
					for(var i = 0; i < loungeArtists.length; i++){
						if(loungeArtists[i].name == correctedName){
							var registered = false;
							for (var i=0; i<lounge.devIds; i++){
								if (genId == lounge.devIds[i].genId)
									registered = true;
							};
							if (!registered){
								updateArtistCounter(loungeId, artist.name, 1);
								duplicate = true;
								continue;
							};
						};
					};
					if (!duplicate) {
						var topTracks = [];
						for(var i = 0; i < tracks.length; i++){
							topTracks.push(tracks[i].name);
						}
						lounge.artists.push({
							name: correctedName,
							topSongs: topTracks,
							count: 1,
							likes: 0,
							dislikes: 0
						});
						lounge.save();
					};	
				};
			});
		};
	});
};

exports.newLounge = function (user) {
	var lounge = new Lounge({user: user.id, geolocation: [42.280681,-83.733818], active: true});
	lounge.save();
	return lounge;
}

exports.newUser = function(data) {
	var user = new User({username: data.username, password: data.password, email: data.email});
	user.save();
	return user;
}
exports.queryLounge = function(id) {
	lounge = Lounge.findById(id, function(err, lounge) {
		return lounge;
	});
}

exports.queryLounges = function(location, res) {
	var actives = [];
	Lounge.find({geolocation: {$near: location, $maxDistance: 10}}, function(err, lounges){ 
		if (err){
			console.log(err);
			res.send("NONE FOUND");
		} else {
			for (var i = 0; i < lounges.length; i++) {
				//if (lounges.active)
				var lounge = lounges[i];
				lounge.nowPlaying = lounges[i].queue[0];
				actives.push(lounge);
			};
			res.send(actives);
		};
	});
}

exports.queryLoungeInformation = function(loungeId){
	var Lounge = mongoose.model('Lounge');
	Lounge.findById(loungeId, function(err, lounge){ 
		return lounge;
	});
}

exports.likeArtist = function(loungeId, artist) {
	updateArtistCounter(loungeId, artist, 1);
}

exports.dislikeArtist = function(loungeId, artist) {
	updateArtistCounter(loungeId, artist, -1);
}

function updateArtistCounter (loungeId, artist, increment){
	console.log(loungeId);
	Lounge.findById(loungeId, function(err, lounge) {
		if (err) return
		var artists = lounge.artists;
		for(var i = 0; i < artists.length; i++) {
			if(artists[i].name == artist){
				lounge.artists[i].count += increment;
				lounge.save();
				return;
			}
		}
	});
}

exports.recommendSong = function(songJson, loungeId) {
	Lounge.findById(loungeId, function(err, lounge){
		var requested = lounge.requested;
		
		for(var i = 0; i < requested.length; i++) {
			if(requested[i].name == songJson.artist){
				return;
			} 
		}
		
		requested.push({song: songJson.track, artist: songJson.artist});
	});
	
}

exports.nextSong = function(id, res){
	var nextSong = musicAlgorithm.getNextSong();
	var queueResults;
	
	Lounge.findById(id, function(err, lounge){
		lounge.queue.slice(1).push({artist: nextSong.artist, song: nextSong.song, img: ""});
		res.send(lounge.queue);
		for (var i = 0; i < lounge.devIds.length; i++) {
			gcmHelpers.sendChanged([lounge.devIds[i].regId]);
		}
	});	
}
