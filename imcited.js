// Fetch the site configuration
var siteConf = require('./lib/getConfig');

process.title = siteConf.uri.replace(/http:\/\/(www)?/, '');

var airbrake;
if (siteConf.airbrakeApiKey) {
	airbrake = require('airbrake').createClient(siteConf.airbrakeApiKey);
}

process.addListener('uncaughtException', function (err, stack) {
	console.log('Caught exception: '+err+'\n'+err.stack);
	console.log('\u0007'); // Terminal bell
	if (airbrake) { airbrake.notify(err); }
});

var connect = require('connect');
var express = require('express');
var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');
var notifoMiddleware = require('connect-notifo');
//var DummyHelper = require('./lib/dummy-helper');
var request = require('request'),
	mongo = require('mongoskin');

db = mongo.db('localhost:27017/imcited');
citations = db.collection('citations');


var app = module.exports = express.createServer();
app.listen(siteConf.port, null);

// Setup socket.io server
//var socketIo = new require('./lib/socket-io-server.js')(app, sessionStore);
//var authentication = new require('./lib/authentication.js')(app, siteConf);

// Setup groups for CSS / JS assets
var assetsSettings = {
	'js': {
		'route': /\/static\/js\/[a-z0-9]+\/.*\.js/
		, 'path': './public/js/'
		, 'dataType': 'javascript'
		, 'files': [
			'http://code.jquery.com/jquery.min.js'
			//, siteConf.uri+'/socket.io/socket.io.js' // special case since the socket.io module serves its own js
			, 'plugins.js'
			, 'ejs/ejs_production.js'
			, 'client.js'

		]
		, 'debug': true
		, 'postManipulate': {
			'^': [
				assetHandler.uglifyJsOptimize
				/*function insertSocketIoPort(file, path, index, isLast, callback) {
					callback(file.replace(/.#socketIoPort#./, siteConf.port));
				}*/
			]
		}
	},
        'css': {
		'route': /\/static\/css\/[a-z0-9]+\/.*\.css/
		, 'path': './public/css/'
		, 'dataType': 'css'
		, 'files': ['bootstrap.less']
		, 'debug': true
                , 'preManipulate': {
                    '^': [
                      assetHandler.lessCompile // CUSTOM HANDLER written by me :)
                    ]

                }
                , 'postManipulate': {
                        '^': [
                            assetHandler.fixVendorPrefixes
			    , assetHandler.fixGradients
		            , assetHandler.replaceImageRefToBase64(__dirname+'/public')
			    , assetHandler.yuiCssOptimize
                        ]
                }
	}
};

// Add auto reload for CSS/JS/templates when in development
app.configure('development', function(){
        //assetsSettings.js.files.push('jquery.frontend-development.js');
        //assetsSettings.css.files.push('frontend-development.css');
	/*[['js', 'updatedContent'], ['css', 'updatedCss']].forEach(function(group) {
		assetsSettings[group[0]].postManipulate['^'].push(function triggerUpdate(file, path, index, isLast, callback) {
			callback(file);
			dummyHelpers[group[1]]();
		});
	});*/
});

var assetsMiddleware = assetManager(assetsSettings);

// Settings
app.configure(function() {
	app.set('view engine', 'ejs');
	app.set('views', __dirname+'/views');
});

// Middleware
app.configure(function() {
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(assetsMiddleware);
	/*app.use(express.session({
		'store': sessionStore
		, 'secret': siteConf.sessionSecret
	}));*/
	app.use(express.logger({format: ':response-time ms - :date - :req[x-real-ip] - :method :url :user-agent / :referrer'}));
	/*app.use(authentication.middleware.auth());
	app.use(authentication.middleware.normalizeUserData());*/
	app.use(express['static'](__dirname+'/public', {maxAge: 86400000}));
	//app.use(express['static'](__dirname+'/views/frontend_templates'));

	// Send notification to computer/phone @ visit. Good to use for specific events or low traffic sites.
	if (siteConf.notifoAuth) {
		app.use(notifoMiddleware(siteConf.notifoAuth, {
			'filter': function(req, res, callback) {
				callback(null, (!req.xhr && !(req.headers['x-real-ip'] || req.connection.remoteAddress).match(/192.168./)));
			}
			, 'format': function(req, res, callback) {
				callback(null, {
					'title': ':req[x-real-ip]/:remote-addr @ :req[host]'
					, 'message': ':response-time ms - :date - :req[x-real-ip]/:remote-addr - :method :user-agent / :referrer'
				});
			}
		}));
	}
});

// ENV based configuration

// Show all errors and keep search engines out using robots.txt
app.configure('development', function(){
	app.use(express.errorHandler({
		'dumpExceptions': true
		, 'showStack': true
	}));
	app.all('/robots.txt', function(req,res) {
		res.send('User-agent: *\nDisallow: /', {'Content-Type': 'text/plain'});
	});
});
// Suppress errors, allow all search engines
app.configure('production', function(){
	app.use(express.errorHandler());
	app.all('/robots.txt', function(req,res) {
		res.send('User-agent: *', {'Content-Type': 'text/plain'});
	});
});

// Template helpers
app.dynamicHelpers({
	'assetsCacheHashes': function(req, res) {
		return assetsMiddleware.cacheHashes;
	}
	, 'session': function(req, res) {
		return req.session;
	}
});

// Error handling
app.error(function(err, req, res, next){
	// Log the error to Airbreak if available, good for backtracking.
	console.log(err);
	if (airbrake) { airbrake.notify(err); }

	if (err instanceof NotFound) {
		res.render('errors/404');
	} else {
		res.render('errors/500');
	}
});
function NotFound(msg){
	this.name = 'NotFound';
	Error.call(this, msg);
	Error.captureStackTrace(this, arguments.callee);
}

// Routing
/*
app.all('/get-citation', function(req, res) {
	var postData = req.body;
	postData.key = '32e68b0a1a6cdb014b909b4d2b51f752';

	request({
		url: 'http://api-easybib.apigee.com/2.0/rest/cite',
		method: "PUT",
		body: JSON.stringify(postData),
	}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    res.send(body);
	  } else {
		res.send('error: '  + error);
	  }
	});
});*/

app.all('/', function(req, res) {

	res.locals({
		'page': 'index'
	});
	res.render('index');
});

app.post('/cite/publish', function(req, res) {
	var postData = req.body;

	function generateURL() {
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
		var string_length = 5;
		var randomstring = '';
		for (var i=0; i<string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum+1);
		}
		return randomstring;
		/*citations.find({ 'url': randomstring}, function(err, cursor) {
			console.log(cursor);
		});*/
	}
	postData.url = generateURL();

	citations.save(postData, { upsert: true }, function() {
		var s = {status: "ok", url: postData.url};
		res.json(s);
	});
	//res.redirect('cite/' + asd);
});

app.all('/c/:el', function(req,res) {
	citations.find({url: req.params.el}).limit(1).each(function(err, dat) {
		res.locals({
			'results': dat.citations,
			'statement': dat.statement,
			'url': dat.url
		});
		res.render('c/index.ejs');
	});
});

app.all('/cite/:pg', function(req, res) {
	// this isnt working... fix later
	var loc = req.params.pg || 'home';
	res.locals({
		'page': loc
	});
	res.render('cite/' + loc);
});

// Initiate this after all other routing is done, otherwise wildcard will go crazy.
//var dummyHelpers = new DummyHelper(app);

// If all fails, hit em with the 404
app.all('*', function(req, res){
	throw new NotFound;
});

console.log('Running in '+(process.env.NODE_ENV || 'development')+' mode @ '+siteConf.uri);
