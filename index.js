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

            const pool = new Pool(config);

            //const { Client } = require('pg');
            //const client = new Client({
            //    connectionString: process.env.DATABASE_URL,
            //});
            //client.connect();
            let client = await pool.connect();
            ////////////////////////////////////////////////////

            // Проверяем пользователя в базе данных
            let rs = await client.query("SELECT name, url FROM users WHERE name=$1;", [req.body.session.user_id]);
            if (rs.rows.length > 0) {
                // Проверяем отмену авторизации
                if ((req.body.request.command.toLowerCase().indexOf("выход") !== -1) && (req.body.request.command.toLowerCase().indexOf("авторизац") !== -1)) {
                    await client.query("DELETE FROM users WHERE name=$1;", [req.body.session.user_id]);
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
