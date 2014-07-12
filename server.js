// required
var fs = require('fs'),
	express = require('express'),
	jade = require('jade'),
	config = global.config = ( ( process.env.NODE_ENV != "development" ) ? require('./config/config.json') : require('./config/config_dev.json') ),
	router = require('./config/router.json'),
	utility = require('utility');


// db utility inclusion
if( config.use_db )	global.db = require('mysql/db');
else 				global.db = false;

// create express app
var app = express( );

// static resources
app.use( express.static(__dirname + config.static) );


//check router
if( typeof router != "undefined" ) {
	
	// router setter
	var routerSet = (function(_url,_page,_p){
		(app[_page.method])(_url, function(req, res, next){
		  // create controller data
		  var controllers_data = { };
		  
		  // template data
		  var tpl_data = {
			  NODE_ENV: process.env.NODE_ENV
		  };
		  
		  // controller
		  var controller = [ _p ];
		  
		  // force HeaderState variable
		  res.HeaderState = 200;
		  
		  // queue
		  var q = new utility.queue();
		  
		  // call respective controller
		  if( _page.controller ) {
			// check array
			if( typeof _page.controller == "Object" && _page.controller.length )
				controller = _page.controller;
			else // set to array singular method
				controller = [ _page.controller ];
		  }
		  
		  // check controller to run
		  if( controller && controller.length ) {
			  // loop controller
			  for( var i in controller ) {
				  // check file exists
				  (function(_c){
					var exists = fs.existsSync('./controller/' + _c + '.js');
					if( exists ) {
					  // console.log("run controller " + _c);
					  
					  // run controller and set up data exported into queue
					  var _cexec = require('./controller/' + _c + '.js');
					  q.add(function(next){
						  _cexec( req, res, controllers_data, tpl_data, next );
					  });
					}
				  })(controller[i]);
			  }
		  }
		  
		  // add template 404 - requested by page controller, check res.HeaderState == 404
		  q.add(function(next){
			  // render jade template
			  jade.renderFile('view/404.jade', tpl_data, function(err,html){
				if (err) throw err;
				res.setHeader('Content-Type', 'text/html');
				res.setHeader('charset', 'utf-8');
				res.setHeader('Content-Length', html.length);
				if( _page.send )
					res.send(html, 404);
				else
					res.end(html);
			  });
		  }).if(function(){
			  return ( ( res.HeaderState == 404 ) ? true : false );
		  });
		  
		  // add template 500 - requested by page controller, check res.HeaderState == 500
		  q.add(function(next){
			  // render jade template
			  jade.renderFile('view/500.jade', tpl_data, function(err,html){
				if (err) throw err;
				res.setHeader('Content-Type', 'text/html');
				res.setHeader('charset', 'utf-8');
				res.setHeader('Content-Length', html.length);
				if( _page.send )
					res.send(html, 500);
				else
					res.end(html);
			  });
		  }).if(function(){
			  return ( ( res.HeaderState == 500 ) ? true : false );
		  });
		  
		  // add template for page
		  q.add(function(next){
		  	  // check HeaderState
		  	  if( _page.send ) {
			  	  res.HeaderState = _page.send;
		  	  }
		  
			  // render jade template
			  jade.renderFile('view/'+ ( ( _page.view ) ? _page.view : _p ) +'.jade', tpl_data, function(err,html){
				if (err) throw err;
				res.setHeader('Content-Type', 'text/html');
				res.setHeader('charset', 'utf-8');
				res.setHeader('Content-Length', html.length);
				if( _page.send )
					res.send(html, _page.send);
				else
					res.end(html);
			  });
		  });
		  
		  q.start();
		});
	});
	
	// loop page in router config
	for( var p in router ) {
		// page info
		var page = router[ p ];
		if( typeof page.url == "object" && page.url.length ) {
			for( var j in page.url ){
				routerSet(page.url[j],page,page.page);
			}
		} else {
			routerSet(page.url,page,page.page);
		}
	}
}

// server listen
app.listen( config.listen.port, config.listen.ip );