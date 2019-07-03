const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

let options = "";
let sURL = "";
const request_ = require('request');

app.post('/', function (req, res) {

    try{
        // Подключение к базе данных
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
        });
        client.connect();

        // Проверяем пользователя в базе данных
        client.query("SELECT name, url FROM users WHERE name=$1;", [req.body.session.user_id], function(err, rs){
            if(rs.rows.length > 0){
                // Проверяем отмену авторизации
                if((req.body.request.command.toLowerCase().indexOf("отмена") !== -1)&&(req.body.request.command.toLowerCase().indexOf("авторизац") !== -1)){
                    client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function(err, rs) {
                    });
                }
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
                        // Удаляем привязку, если не смогли перейти на клиента
                        client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function(err, rs) {
                            res.json({
                                version: req.body.version,
                                session: req.body.session,
                                response: {
                                    text: "Ошибка подключения к ресурсу "+sURL+". "+error,
                                    end_session: false,
                                },
                            });
                        });
                    }
                });
            }else{
                // Новый пользователь
                if(req.body.request.command !== ""){
                    // Есть текст команды
                    let mURL = req.body.request.command.split(" ");
                    if(mURL.length<5){
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
                            sURL = mURL[0]+"://"+mURL[1]+"."+mURL[2]+"."+mURL[3]+((mURL.length>5)?":"+mURL[4]:"")+"/portal/alisa.asp";
                            client.query("INSERT INTO users(name, url) values($1, $2);", [req.body.session.user_id, sURL], function(err, rs) {
                                options = {
                                    url: sURL + "?step=1",
                                    method: 'PUT',
                                    body: JSON.stringify(
                                        {
                                            session: req.body.session,
                                            nlu: req.body.request.nlu,
                                            command: req.body.request.command
                                        })
                                };
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
                                        // Удаляем привязку, если не смогли перейти на клиента
                                        client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function(err, rs) {
                                            res.json({
                                                version: req.body.version,
                                                session: req.body.session,
                                                response: {
                                                    text: "Ошибка подключения к ресурсу "+sURL+". "+error,
                                                    end_session: false,
                                                },
                                            });
                                        });
                                    }
                                });
                            });
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
        });

    }catch(e){
        let err = 'Ошибка ' + e.name + ":" + e.message + "\n" + e.stack;

        res.json({
            version: req.body.version,
            session: req.body.session,
            response: {
                text: err,
                end_session: false,
            },
        });
    }

    setTimeout(function(req_, res_) {
        try {
            res_.json({
                version: req_.body.version,
                session: req_.body.session,
                response: {
                    text: "Команда выполняется. Узнайте статус выполнения позже.",
                    end_session: false,
                },
            });
        }catch(e) {
            
        }
    }, 1500, req, res);

});

app.use('*', function (req, res) {
    res.sendStatus(404);
});

app.listen(port);
