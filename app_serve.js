
/**
    MOOD App
*/
var cors = require('cors'); //CROSS DOMAIN REQUESTS
var EventSource = require('eventsource'); //EVENT SOURCE to listen for Physical Mood Buttons



/*********************************/
/* MODULES DEPENDENCIES */
var mongoose = require('mongoose'); // Mongoose import
var models = require('./models');
var request = require('request'); //Used to make POSTs GETs requests internally (not used)

// SERVER variables
var express = require('express');
var path = require('path');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

// Bootstrap express
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(process.env.PORT || 3001);
console.log(process.env.PORT);
app.use(bodyParser());
//app.use(express.static(__dirname + '/public')); //So it loads css, js, etc files and static stuff
app.use('/assets', express.static(path.join(__dirname, '/assets')));
app.use('/css',express.static(path.join(__dirname, '/css')));
//CROSS DOMAIN
app.use(cors());
/********************************************************
 * Database connection configuracion
 * Mongoose connection to MongoDB
*********************************************************/
 mongoose.connect('mongodb://localhost:'+'27017'+'/mooddb', function (error) { //Local
    if (error) {
        console.log("Cant Connect to mongoDB: "=error);
    }
});

// Mongoose Models definition
var MoodPointModel = models.MoodPointModel;


// ******************************************
// SOCKETS Management and URL Routes
// ******************************************
io.sockets.on('connection', function (socket) {
  // socket.on('join', function (data) {
  //   socket.join(data.room);  
  // });
  logConnectedUsers();

  socket.on('disconnect', function() {
      console.log('Got disconnect!');
      logConnectedUsers();    
   });
  

});



app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
// app.get('/cms', function (req, res) {
//   res.sendfile(__dirname + '/cms.html');
// });
// app.get('/smallres', function (req, res) {
//   res.sendfile(__dirname + '/screen2.html');
// });
// app.get('/2by2', function (req, res) {
//   res.sendfile(__dirname + '/2by2.html');
// });

// Listen for real time Physical Buttons clicks
var SparkCoreURL = "https://api.spark.io/v1/devices/48ff6c065067555048241387/events";
var eventSourceInitDict = {
    headers: {Authorization: "Bearer e415d07f215cb40405fc7b66e9641a45ef0ed368"}
};
var es = new EventSource(SparkCoreURL, eventSourceInitDict);

es.addEventListener('mood', function(e) {
    var rawData = JSON.parse(e.data);
    var parsedData = JSON.parse(rawData.data);
    console.log(parsedData);
    saveCDMMoodPoint(parsedData);  
});

es.onerror = function(err) {
  if (err) {
    if (err.status === 401 || err.status === 403) {
      console.log('not authorized');
    }
  }
};

//URL ROUTING

app.route('/mood')
    .get(function(req, res, next) {
        MoodPointModel.find({}, function (err, docs) {
            res.json(docs);
        });
    })
    .post(function(req, res, next) {
        var moodPoint;
          console.log("POST: ");
          console.log(req.body);
          moodPoint = new MoodPointModel({
            message: req.param('message'),
            mtype: req.param('mtype'),
            locName: req.param('locName'),
            loc: {
                type: "Point",
                coordinates:req.param('loc')
            }
          });
          moodPoint.save(function (err) {
            if (!err) {
              console.log("MoodPoint created");
              io.emit('NewMood',moodPoint); //Sends WebSockets message to all listeners
              return res.json(moodPoint);
            } else {
              return console.log(err);
            }
          });
          
    });
    //Sample code to get nearby points sending user location and radio as params.
    // .get(function(req, res, next) {
    //     console.log(req.param('loc'));
    //     req.query.radio = parseInt(req.query.radio);
    //     Balacera.find({ loc :
    //                     { $near:
    //                        { $geometry :
    //                             {   type : 'Point' ,
    //                                 coordinates : req.param('loc') 
    //                             } ,
    //                          $maxDistance : req.query.radio//req.param('radio')
    //                         } 
    //                     } 
    //                 }, function (err, docs) {
    //                 docs.forEach(function(entry) {
    //                     //console.log(entry);
    //                     var lati = entry.loc.coordinates[1];
    //                     var longi = entry.loc.coordinates[0];
    //                     // var locationObj = {};
    //                     // locationObj.lat = lati;
    //                     // locationObj.lon = longi;
    //                     // var ubi = {'lat':lati,'lon':longi}
    //                     //console.log(ubi);
    //                     entry.loc = [lati,longi];

    //                 });
    //         res.send(docs);
    //     });
    // })

function saveCDMMoodPoint(moodTypeParam){
  var moodPoint;
          console.log("PUBLISHED: ");
          
          moodPoint = new MoodPointModel({
            mtype: moodTypeParam,
            locName: "CDM Hangar",
            loc: {
                type: "Point",
                coordinates:[49.267574599999996,-123.090327] //Centre for Digi Media
            }
          });
          moodPoint.save(function (err) {
            if (!err) {
              console.log("MoodPoint created");
              io.emit('NewMood',moodPoint); //sends WebSockets message to all listeners
            } else {
              return console.log(err);
            }
          });

}

function findClientsSocket(roomId, namespace) { //Params are optional
    var res = []
    , ns = io.of(namespace ||"/");    // the default namespace is "/"

    if (ns) {
        for (var id in ns.connected) {
            if(roomId) {
                var index = ns.connected[id].rooms.indexOf(roomId) ;
                if(index !== -1) {
                    res.push(ns.connected[id]);
                }
            } else {
                res.push(ns.connected[id]);
            }
        }
    }
    return res;
}
// A log function for debugging purposes
function logConnectedUsers() {
    console.log("============= CONNECTED USERS ==============");
    console.log("==  ::  " + findClientsSocket().length );
    console.log("============================================");
    io.emit("usersConnected", findClientsSocket().length );
}