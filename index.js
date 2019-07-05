const express = require('express');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

let options = "";
let sURL = "";
const request_ = require('request');

app.post('/', function (req, res) {
    (async () => {
        try {
            // Подключение к базе данных //////////////////////
            const Pool = require('pg-pool');
            const url = require('url')

            // Параметры подключения
            const params = url.parse(process.env.DATABASE_URL);
            const auth = params.auth.split(':');
            const config = {
                user: auth[0],
                password: auth[1],
                host: params.hostname,
                port: params.port,
                database: params.pathname.split('/')[1],
                ssl: true
            };
            // Подключаемся к базе
            const pool = new Pool(config);
            let client = await pool.connect();
            ////////////////////////////////////////////////////

            // Проверяем пользователя в базе данных
            let command = "" + req.body.request.command;
            let rs = await client.query("SELECT * FROM users WHERE name=$1;", [req.body.session.user_id]);
            if (rs.rows.length > 0) {
                if((!(rs.rows[0].auth == 0)) && (rs.rows[0].step==0)){ // NULL
                    // Есть авторизация
                    /////////////////////////////////////////////////////////////////////////////////////////////////
                    // Переадрисация на клиента
                    options = {
                        url: rs.rows[0].url + "/close/alisa.asp",
                        method: 'PUT',
                        headers : {
                            "Authorization" : "Basic " + (""+rs.rows[0].auth).toString("base64")
                        },
                        body: JSON.stringify( {session: req.body.session, nlu: req.body.request.nlu,
                            command: req.body.request.command
                        })
                    };
                    request_(options, function (error, response, body) {
                        if (!error) {
                            client.release();
                            res.json({
                                version: req.body.version,
                                session: req.body.session,
                                response: {
                                    text: body,
                                    end_session: false,
                                },
                            });
                        } else {
                            // Удаляем привязку, если не смогли перейти на клиента
                            client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function (err, rs) {
                                client.release();
                                res.json({version: req.body.version, session: req.body.session, response: {
                                        text: "Ошибка подключения к ресурсу " + sURL + ". " + error,
                                        end_session: false,
                                    },
                                });
                            });
                        }
                    });
                    /////////////////////////////////////////////////////////////////////////////////////////////////
                }else{
                    let step = rs.rows[0].step;
                    // Получаем адрес ресурса
                    if(step==1){
                        if(command===""){
                            client.release();
                            res.json({version: req.body.version, session: req.body.session, response: {
                                    text: "Укажите адрес ресурса",
                                    end_session: false,
                                },
                            });
                            return;
                        }

                        let mURL = command.split(" ");
                        sURL = "";
                        let i = 0;
                        for(i=0; i<mURL.length; i++){
                            if(i===1) sURL += "://";
                            if((i===2)||(i===3)) sURL += ".";
                            if(i===4) sURL += ":";
                            sURL += mURL[i];
                        }
                        await client.query("UPDATE users SET url=$1, step=2 where name=$2;", [sURL, req.body.session.user_id]);
                        // Возвращаем результат
                        client.release();
                        res.json({version: req.body.version, session: req.body.session, response: {
                                text: "Задайте логин",
                                end_session: false,
                            },
                        });
                        return;
                    }
                    // Получаем логин
                    if(step==2){
                        if(command===""){
                            client.release();
                            res.json({version: req.body.version, session: req.body.session, response: {
                                    text: "Задайте логин",
                                    end_session: false,
                                },
                            });
                            return;
                        }

                        await client.query("UPDATE users SET auth=$1, step=3 where name=$2;", [command, req.body.session.user_id]);
                        // Возвращаем результат
                        client.release();
                        res.json({version: req.body.version, session: req.body.session, response: {
                                text: "Укажите пароль",
                                end_session: false,
                            },
                        });
                        return;
                    }
                    // Получаем пароль
                    if(step==3){
                        if(command===""){
                            client.release();
                            res.json({version: req.body.version, session: req.body.session, response: {
                                    text: "Задайте пароль",
                                    end_session: false,
                                },
                            });
                            return;
                        }

                        let str = "" + rs.rows[0].auth + ":" + command;
                        await client.query("UPDATE users SET auth=$1, step=0 where name=$2;", [str, req.body.session.user_id]);
                        /////////////////////////////////////////////////////////////////////////////////////////////////
                        // Переадрисация на клиента
                        options = {
                            url: rs.rows[0].url + "/close/alisa.asp",
                            method: 'PUT',
                            headers : {
                                "Authorization" : "Basic " + str.toString("base64")
                            },
                            body: JSON.stringify( {session: req.body.session, nlu: req.body.request.nlu,
                                command: req.body.request.command
                            })
                        };
                        request_(options, function (error, response, body) {
                            if (!error) {
                                client.release();
                                res.json({
                                    version: req.body.version,
                                    session: req.body.session,
                                    response: {
                                        text: body,
                                        end_session: false,
                                    },
                                });
                            } else {
                                // Удаляем привязку, если не смогли перейти на клиента
                                client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function (err, rs) {
                                    client.release();
                                    res.json({version: req.body.version, session: req.body.session, response: {
                                            text: "Ошибка подключения к ресурсу " + sURL + ". " + error,
                                            end_session: false,
                                        },
                                    });
                                });
                            }
                        });
                        /////////////////////////////////////////////////////////////////////////////////////////////////
                    }

                    // Проверяем отмену авторизации
                    if ((req.body.request.command.toLowerCase().indexOf("выход") !== -1) && (req.body.request.command.toLowerCase().indexOf("авторизац") !== -1)) {
                        await client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id]);
                    }

                }
            }else{
                // Новый пользователь
                await client.query("INSERT INTO users(name, step) values($1, 1);", [req.body.session.user_id]);
                // Возвращаем результат
                client.release();
                res.json({version: req.body.version, session: req.body.session, response: {
                        text: "Укажите адрес ресурса",
                        end_session: false,
                    },
                });
            }
            return;

                // Проверяем пользователя в базе данных
            rs = await client.query("SELECT name, url FROM users WHERE name=$1;", [req.body.session.user_id]);
            if (rs.rows.length > 0) {
                // Проверяем отмену авторизации
                if ((req.body.request.command.toLowerCase().indexOf("выход") !== -1) && (req.body.request.command.toLowerCase().indexOf("авторизац") !== -1)) {
                    await client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id]);
                }
                options = {
                    url: rs.rows[0].url,
                    method: 'PUT',
                    body: JSON.stringify( {session: req.body.session, nlu: req.body.request.nlu,
                        command: req.body.request.command
                        })
                };
                request_(options, function (error, response, body) {
                    if (!error) {
                        client.release();
                        res.json({
                            version: req.body.version,
                            session: req.body.session,
                            response: {
                                text: body,
                                end_session: false,
                            },
                        });
                    } else {
                        // Удаляем привязку, если не смогли перейти на клиента
                        client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function (err, rs) {
                            client.release();
                            res.json({
                                version: req.body.version,
                                session: req.body.session,
                                response: {
                                    text: "Ошибка подключения к ресурсу " + sURL + ". " + error,
                                    end_session: false,
                                },
                            });
                        });
                    }
                });
            } else {
                // Новый пользователь
                if (req.body.request.command !== "") {
                    // Есть текст команды
                    let mURL = req.body.request.command.split(" ");
                    if (mURL.length < 5) {
                        // Короткий ключ
                        client.end();
                        res.json({
                            version: req.body.version,
                            session: req.body.session,
                            response: {
                                text: "Задайте код доступа",
                                end_session: false,
                            },
                        });
                    } else {
                        if (mURL[0].indexOf("http") === -1) {
                            // Префикс протокола не правильный
                            client.release();
                            res.json({
                                version: req.body.version,
                                session: req.body.session,
                                response: {
                                    text: "Задайте код доступа",
                                    end_session: false,
                                },
                            });
                        } else {
                            sURL = mURL[0] + "://" + mURL[1] + "." + mURL[2] + "." + mURL[3] + ((mURL.length > 5) ? ":" + mURL[4] : "") + "/portal/alisa.asp";
                            await client.query("INSERT INTO users(name, url) values($1, $2);", [req.body.session.user_id, sURL]);
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
                                    client.release();
                                    res.json({
                                        version: req.body.version,
                                        session: req.body.session,
                                        response: {
                                            text: body,
                                            end_session: false,
                                        },
                                    });
                                } else {
                                    // Удаляем привязку, если не смогли перейти на клиента
                                    client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id], function (err, rs) {
                                        client.release();
                                        res.json({
                                            version: req.body.version,
                                            session: req.body.session,
                                            response: {
                                                text: "Ошибка подключения к ресурсу " + sURL + ". " + error,
                                                end_session: false,
                                            },
                                        });
                                    });
                                }
                            });
                        }

                    }
                } else {
                    client.end();
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

        } catch (e) {
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

        setTimeout(function (req_, res_) {
            try {
                client.end();
                res_.json({
                    version: req_.body.version,
                    session: req_.body.session,
                    response: {
                        text: "Команда выполняется. Узнайте статус выполнения позже.",
                        end_session: false,
                    },
                });
            } catch (e) {

            }
        }, 1500, req, res);

    })().catch(e =>
        res.json({
            version: req.body.version,
            session: req.body.session,
            response: {
                text: 'Ошибка ' + e.name + ":" + e.message + "\n" + e.stack,
                end_session: false,
            },
        })
    )

});

app.use('*', function (req, res) {
    res.sendStatus(404);
});

app.listen(port);
