const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post('/', function (req, res) {

try{

var pg = require('pg');

pg.connect(process.env.DATABASE_URL, function(err, client, done) {

    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: "--" + err,
        end_session: false,
      },
    });

//  client.query('SELECT * FROM your_table', function(err, result) {
//  });
});

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

});

app.use('*', function (req, res) {
  res.sendStatus(404);
});

app.listen(port);