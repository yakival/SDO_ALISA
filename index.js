const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post('/', function (req, res) {

try{

var Datastore = require('nedb');
var db = new Datastore({filename : 'users.db', autoload: true});

db.insert({name : "Boris", year: 1946}, function (error, newDoc) {

    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: "1111",
        end_session: false,
      },
    })
})

}catch(e){
  var err = 'Ошибка ' + e.name + ":" + e.message + "\n" + e.stack;

    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: err,
        end_session: false,
      },
    });

}

  if (req.body.request.command == "no text")
  {
    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: "",
        end_session: false,
      },
    });
  }

  else if (req.body.request.command == "no version")
  {
    res.json({
      session: req.body.session,
      response: {
        text: req.body.request.command || 'Hello!',
        end_session: false,
      },
    });
  }

  else if (req.body.request.command == "no session")
  {
    res.json({
      version: req.body.version,
      response: {
        text: req.body.request.command || 'Hello!',
        end_session: false,
      },
    });
  }

  else if (req.body.request.command == "end session")
  {
    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: req.body.request.command || 'Hello!',
        end_session: true,
      },
    });
  }

  else 
  {
    res.json({
      version: req.body.version,
      session: req.body.session,
        response: {
          text: req.body.request.command || 'Hello!',
          
          end_session: false,
        },
    })
  ;}
});

app.use('*', function (req, res) {
  res.sendStatus(404);
});

app.listen(port);