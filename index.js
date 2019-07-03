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

  // ��������� ������������ � ���� ������
  client.query('SELECT name, url FROM users WHERE name=$1;', [req.body.session.user_id], function(err, rs){
    if(rs.rows.length > 0){

    }else{
      // ����� ������������
      if(res.body.request.command != ""){
        // ���� ����� �������
        var mURL = res.body.request.command.split(" ");
      }else{
        res.json({
          version: req.body.versiocn,
          session: req.body.session,
          response: {
            text: "������� ��� �������",
            end_session: false,
          },
        });
      }
    }
    client.end();
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