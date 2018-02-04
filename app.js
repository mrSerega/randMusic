var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var pages = require('./pages/index.js');

var bodyParser = require('body-parser');
var mongoClient = require("mongodb").MongoClient;

var UserDbUrl = "mongodb://localhost:27017/test";

var urlencodedParser = bodyParser.urlencoded({
    extended: false
});

var client_id = 'bb843121ea624fb0a2705c84f226bc4a'; // Your client id
var client_secret = '5c7ae70f48fa43a4957e99468fda8901'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public')).use(cookieParser());

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));

});

app.get('/game', function(req, res){
    res.send(pages.signin());
});

app.get('/callback', function (req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function (req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

app.get('/mainpage', function (req, res) {
    var name = "Tegan";
    var password = "soilsoil123";
    mongoClient.connect(UserDbUrl, function (err, db) {
        if (err) throw err;
        var query = {name:name};
        db.collection("users").findOne(query, function (err, result) {
            if (err) throw err;
            if(result.password == password)
                console.log("You are In");
            else console.log("Wrong Password");
            db.close();
        });
    });
});

app.get('/signup', function (req, res) {
    var name = "Lindsey";
    var password = "darkcomesoon";
    mongoClient.connect(UserDbUrl, function (err, db) {
        if (err) throw err;
        var query = {name:name};
        db.collection("users").find(query).toArray(function (err, result) {
            if (err) throw err;
            if (result.length == 0) {
                    db.collection("users").insert({name:name, password:password});
                    console.log("user added");
                }
            else console.log("user already exists");
            db.close();
        });
    });
});

console.log('Listening on 8888');
app.listen(8888);
