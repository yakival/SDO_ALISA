const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post('/', function (req, res) {

try{

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

client.connect();

    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: "--" + err,
        end_session: false,
      },
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