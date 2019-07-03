const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post('/', function (req, res) {

try{
  res.charset = 'Windows-1251';

  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  client.connect();

  // Проверяем пользователя в базе данных
  client.query('SELECT name, url FROM users WHERE name=$1;', [req.body.session.user_id], function(err, rs){
    if(rs.rows.length > 0){

    }else{
      // Новый пользователь
      if(req.body.request.command !== ""){
        // Есть текст команды
        var mURL = req.body.request.command.split(" ");
        if(mURL.length<4){
          // Короткий ключ
          res.json({
            version: req.body.version,
            session: req.body.session,
            response: {
              text: "Задайте код доступа",
              end_session: false,
            },
          });
        }else{
          if(mURL[0].indexOf("http")===-1){
            // Префикс протокола не правильный
            res.json({
              version: req.body.version,
              session: req.body.session,
              response: {
                text: "prefix---Задайте код доступа",
                end_session: false,
              },
            });
          }else{

          }
        }
      }else{
        res.json({
          version: req.body.version,
          session: req.body.session,
          response: {
            text: "Задайте код доступа",
            end_session: false,
          },
        });
      }
    }
    client.end();
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