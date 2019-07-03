const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post('/', function (req, res) {

try{

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

client.query('SELECT table_schema,table_name FROM information_schema.tables;', function(err, rs){
  var str = "";
  for (let row of rs.rows) {
    str += JSON.stringify(row);
  }
  client.end();

    res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: "--"+str,
        end_session: false,
      },
    });

});

}catch(e){

  var err = '������ ' + e.name + ":" + e.message + "\n" + e.stack;

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