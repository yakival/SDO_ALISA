const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

var res_, req_;
var options = "";
var sURL = "";
var request_ = require('request');

app.post('/', function (req, res) {

  try{
    req_ = req;
    res_ = res;

    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    client.connect();

    // Проверяем пользователя в базе данных
    client.query('SELECT name, url FROM users WHERE name=$1;', [req.body.session.user_id], function(err, rs){
      if(rs.rows.length > 0){
        options = {
          url: rs.rows[0].url,
          method: 'PUT',
          body: JSON.stringify(
              {
                session: req.body.session,
                nlu: req.body.request.nlu,
                command: req.body.request.command
              })
        };
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
                  text: "Задайте код доступа",
                  end_session: false,
                },
              });
            }else{
              /*
              client.query("INSERT INTO users(name, url) values('$1', '$2');", [req.body.session.user_id, sURL], function(err, rs) {
                options = {
                  url: sURL,
                  method: 'PUT',
                  body: JSON.stringify(
                      {
                        session: req.body.session,
                        nlu: req.body.request.nlu,
                        command: req.body.request.command
                      })
                };
              });
               */
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
      //client.end();
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

  //httpSend();

  setTimeout(() => {
    res_.json({
      version: req_.body.version,
      session: req_.body.session,
      response: {
        text: "Команда выполняется. Узнайте статус выполнения позже.",
        end_session: false,
      },
    });
  }, 1500);

////////////////////////////////////////////////////////////////////////
  function httpSend(){
    request_(options, function (error, response, body) {
      if (!error) {
        res.json({
          version: req.body.version,
          session: req.body.session,
          response: {
            text: body,
            end_session: false,
          },
        });
      }
      else
      {
        res.json({
          version: req.body.version,
          session: req.body.session,
          response: {
            text: "Ошибка выполнения команды.",
            end_session: false,
          },
        });
      }
    });
  }

});

app.use('*', function (req, res) {
  res.sendStatus(404);
});

app.listen(port);
