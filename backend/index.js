const request = require("request");
const rp = require("request-promise");
const http = require('http');
const path = require('path');
const colors = require('colors/safe');
const Axios = require('axios');
const ExpressTrade = require('expresstrade');
const twoFactor = require('node-2fa');
const crypto = require('crypto');

const server = http.createServer().listen(PORT, function () {
    console.log(colors.cyan("[Server]"), 'Secure backend successfully started on port ' + PORT);
});

const io = require('socket.io')(server);

process.on('unhandledRejection', (reason, p) => {
    console.log(colors.yellow("[Promise]"), 'Unhandled Prmoise Rejection: ', reason);
});

io.on('connection', function (socket) {

    socket.on('socket join', function (data) {
		console.log(colors.grey("[Socket] User joined"));
    });

    socket.on('login token', function (data) {
        var options = {
            method: 'POST',
            url: 'https://oauth.opskins.com/v1/access_token',
            headers:
            {
                'cache-control': 'no-cache',
                Authorization: 'Basic XxXxXAPIKEYBASICXxXxX'
            },
            form: { grant_type: 'authorization_code', code: data }
        };

        request(options, function (error, response, body) {
            if (JSON.parse(body).error) {
                socket.emit("login token", { status: 400, res: JSON.parse(body) })
            } else {
                getProfile(JSON.parse(body).access_token).then((res) => {
                    if(res.status == 200) {
                        socket.emit("login token", { status: 200, res: { auth: JSON.parse(body), user: res.res }});
                    }
                })
            }
        });
    })

    socket.on('load token', function (data) {
        var options = {
            method: 'POST',
            url: 'https://oauth.opskins.com/v1/access_token',
            headers:
            {
                'cache-control': 'no-cache',
                Authorization: 'Basic XxXxXAPIKEYBASICXxXxX'
            },
            form: { grant_type: 'refresh_token', refresh_token: data }
        };

        request(options, function (error, response, body) {
            try {
                if (JSON.parse(body).error) {
                    socket.emit("load token", { status: 400, res: JSON.parse(body) })
                } else {
                    getProfile(JSON.parse(body).access_token).then((res) => {
                        if (res.status == 200) {
                            socket.emit("load token", { status: 200, res: { auth: JSON.parse(body), user: res.res } });
                        }
                    })
                }
            } catch (e) {

            }
            
        });
    })

    socket.on('refresh token', function (data) {
        var options = {
            method: 'POST',
            url: 'https://oauth.opskins.com/v1/access_token',
            headers:
            {
                'cache-control': 'no-cache',
                Authorization: 'Basic XxXxXAPIKEYBASICXxXxX'
            },
            form: { grant_type: 'refresh_token', refresh_token: data }
        };

        request(options, function (error, response, body) {
            if (JSON.parse(body).error) {
                socket.emit("refresh token", { status: 400, res: JSON.parse(body) })
            } else {
                socket.emit("refresh token", { status: 200, res: JSON.parse(body) })
            }
        });
    })

    socket.on('logout token', function (data) {
        var options = {
            method: 'POST',
            url: 'https://oauth.opskins.com/v1/revoke_token',
            headers:
            {
                'cache-control': 'no-cache',
                Authorization: 'Basic XxXxXAPIKEYBASICXxXxX'
            },
            form: { token_type: 'refresh', token: data }
        };

        request(options, function (error, response, body) {
        });
    })

    socket.on('accounts pending', function(data) {
        var i = 0;
        var list = [];

        for(var j = 0; j < data.length; j++) {
            if (data[j].loggedin == true) {
                getAccountOffers(data[j].token, "created", 2, "received", data[j].id).then((res) => {
                    if (res.status == 200) {
                        list.push({acc: res.uid, total: parseInt(res.res.total)});
                    } else {
                        list.push({acc: res.uid, total: 0});
                    }
                    i++;
                    if (i == data.length) {
                        socket.emit('accounts pending', list);
                    }
                });
            } else {
                getAccessToken(data[j].token, data[j].id).then((res => {
                    if(res.status == 200) {
                        getAccountOffers(res.res.access_token, "created", 2, "received", res.uid).then((res) => {
                            if(res.status == 200) {
                                list.push({ acc: res.uid, total: parseInt(res.res.total) });
                            } else {
                                list.push({ acc: res.uid, total: 0 });
                            }
                            i++;
                            if(i == data.length) {
                                socket.emit('accounts pending', list);
                            }
                        });
                    }
                }));
            }
        }
        
    })

    socket.on('offers get', function (data) {
        if(data.state == 2 && data.type == "received") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers got pending", res);
            });
        } else if (data.state == 3 && data.type == "received") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers got accepted", res);
            });
        } else if (data.state == '5,6,7,8,10,12' && data.type == "received") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers got canceled", res);
            });
        } else if (data.type == "received") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers got all", res);
            });
        } else if (data.state == 2 && data.type == "sent") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers sent pending", res);
            });
        } else if (data.state == 3 && data.type == "sent") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers sent accepted", res);
            });
        } else if (data.state == '5,6,7,8,10,12' && data.type == "sent") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers sent canceled", res);
            });
        } else if (data.type == "sent") {
            getOffers(data.key, data.sort, data.state, data.type).then((res) => {
                socket.emit("offers sent all", res);
            });
        }
    })

    socket.on('offer detail', function (data) {
        getOffer(data.key, data.id).then((res) => {
            
            var element = res.res.offer;

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 12) {
                    e1.image = { "300px": e1.image };
                    e1.rarity = null;
                    e1.name = e1.market_name;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 7) {
                    e2.image = { "300px": e2.image };
                    e2.id = parseInt(e2.id);
                    e2.rarity = null;
                }
            })

            socket.emit("offer detail", res);
        })
    })

    socket.on('offer detail re', function (data) {
        getOffer(data.key, data.id).then((res) => {

            var element = res.res.offer;

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 12) {
                    e1.image = { "300px": e1.image };
                    e1.rarity = null;
                    e1.name = e1.market_name;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 7) {
                    e2.image = { "300px": e2.image };
                    e2.id = parseInt(e2.id);
                    e2.rarity = null;
                }
            })

            socket.emit("offer detail re", res);
        })
    })

    socket.on('offer accept', function (data) {
        acceptOffer(data.key, data.tf, data.id).then((res) => {
            try {
            
            } catch (error) {
            
            }

            var element = res.res.offer;

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 12) {
                    e1.image = { "300px": e1.image };
                    e1.rarity = null;
                    e1.name = e1.market_name;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 7) {
                    e2.image = { "300px": e2.image };
                    e2.id = parseInt(e2.id);
                    e2.rarity = null;
                }
            })
			
            socket.emit("offer update", res);
        })
    })

    socket.on('offer accept gift', function (data) {
        acceptGift(data.key, data.id).then((res) => {

            var element = res.res.offer;

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 12) {
                    e1.image = { "300px": e1.image };
                    e1.rarity = null;
                    e1.name = e1.market_name;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 7) {
                    e2.image = { "300px": e2.image };
                    e2.id = parseInt(e2.id);
                    e2.rarity = null;
                }
            })

            socket.emit("offer update", res);
        })
    })

    socket.on('offer decline', function (data) {
        cancelOffer(data.key, data.id).then((res) => {
            var element = res.res.offer;

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 12) {
                    e1.image = { "300px": e1.image };
                    e1.rarity = null;
                    e1.name = e1.market_name;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 7) {
                    e2.image = { "300px": e2.image };
                    e2.id = parseInt(e2.id);
                    e2.rarity = null;
                }
            })

            socket.emit("offer update", res);
        })
    })

    socket.on('offer decline re', function (data) {
        cancelOffer(data.key, data.id).then((res) => {

            var element = res.res.offer;

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 12) {
                    e1.image = { "300px": e1.image };
                    e1.rarity = null;
                    e1.name = e1.market_name;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            element.sender.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            element.recipient.items.forEach(e2 => {
                if (e2.internal_app_id == 7) {
                    e2.image = { "300px": e2.image };
                    e2.id = parseInt(e2.id);
                    e2.rarity = null;
                }
            })

            socket.emit("offer update re", res);
        })
    })

    socket.on('offer decline blacklist', function (data) {
        cancelOffer(data.key, data.id).then((res) => {
        })
    })

    socket.on('inventory show', function (data) {
        getInventory(data.key, data.sort).then((res) => {

            res.res2.items.forEach(element => {
                element.image = { "300px": element.image };
                element.rarity = null;
                element.name = element.market_name;
                res.res1.items.push(element);
            })

            res.res3.items.forEach(element => {
                element.image = { "300px": element.image };
                element.rarity = null;
                element.id = parseInt(element.id);
                res.res1.items.push(element);
            })

            res.res1.total += res.res2.items.length;
            res.res1.total += res.res3.items.length;

            socket.emit("inventory show", {status: res.status, res: res.res1 });
        })
    })

    socket.on('show item', function (data) {
        getItem(data.key, data.id).then((res) => {

            res.res.items.forEach(e2 => {
                if (e2.internal_app_id == 1) {
                    e2.image = { "300px": e2.image["600px"] };
                }
            })

            res.res.items.forEach(e2 => {
                if (e2.internal_app_id == 12) {
                    e2.image = { "300px": e2.image };
                    e2.rarity = null;
                    e2.name = e2.market_name;
                }
            })

            res.res.items.forEach(e1 => {
                if (e1.internal_app_id == 7) {
                    e1.image = { "300px": e1.image };
                    e1.id = parseInt(e1.id);
                    e1.rarity = null;
                }
            })

            socket.emit("show item", res);
        })
    })

    socket.on('trade init', function (data) {
        getUserInventory(data.key, data.uid, 6).then((res) => {

            res.res2.items.forEach(element => {
                element.image = { "300px": element.image };
                element.rarity = null;
                element.name = element.market_name;
                res.res1.items.push(element);
            })

            res.res3.items.forEach(element => {
                element.image = { "300px": element.image };
                element.rarity = null;
                element.id = parseInt(element.id);
                res.res1.items.push(element);
            })

            res.res1.total += res.res2.items.length;
            res.res1.total += res.res3.items.length;

            getInventory(data.key, 6).then((res2) => {

                res2.res2.items.forEach(element => {
                    element.image = { "300px": element.image };
                    element.rarity = null;
                    element.name = element.market_name;
                    res2.res1.items.push(element);
                })

                res2.res3.items.forEach(element => {
                    element.image = { "300px": element.image };
                    element.rarity = null;
                    element.id = parseInt(element.id);
                    res2.res1.items.push(element);
                })

                res2.res1.total += res2.res2.items.length;
                res2.res1.total += res2.res3.items.length;

                socket.emit("trade init", { res: { status: res.status, res: res.res1 }, inv: { status: res2.status, res: res2.res1 }, url: data.url });
            })
        })
    })

    socket.on('trade send', function (data) {
        sendOffer(data.key, data.url, data.tf, data.itemsSend, data.itemsReceive, data.message).then((res) => {
            socket.emit("trade send", res);
        })
    })

    socket.on('settings open', function (data) {
        var favs = [];

        var j = 0;

        getTradeURL(data.key).then((res) => {
            if(data.users.length > 0) {
                data.users.forEach((element, index) => {
                    getFavourite(data.key, element).then((res2) => {
                        socket.emit('alert', res2);
                        if(res2.status == 200) {
                            favs.push({ uid: res2.res.id, name: res2.res.username, avatar: res2.res.avatar });
                        } else {
                            favs.push({ uid: null, name: null, avatar: null });
                        }
                        j++;
                        if(j == data.users.length) {
                            socket.emit("settings open", { url: res, users: favs });
                        }
                    })
                })
            } else {
                socket.emit("settings open", { url: res, users: [] });
            }
        })
    })

    socket.on('withdraw', function(data) {
        withdrawToOpskins(data.key, data.id).then((res) => {
            socket.emit('withdraw', res);
        })
    })
});

async function getAccessToken(refresh, uid) {

    var options = {
        method: 'POST',
        uri: "https://oauth.opskins.com/v1/access_token",
        headers:
        {
            'cache-control': 'no-cache',
            Authorization: 'Basic XxXxXAPIKEYBASICXxXxX'
        },
        form: { grant_type: 'refresh_token', refresh_token: refresh }
    };

    try {
        var response = await rp(options);
        return { status: 200, res: JSON.parse(response), uid: uid };
    } catch (error) {
        return {status: 400 }
    }
}

async function getOffers(access, sort, state, type) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/ITrade/GetOffers/v1?sort=${sort}&type=${type}&per_page=50&state=${state}`);
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getAccountOffers(access, sort, state, type, userId) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/ITrade/GetOffers/v1?sort=${sort}&type=${type}&per_page=50&state=${state}`);
        return { status: 200, res: response.data.response, uid: userId };
    } catch (error) {
        return error.response.data;
    }
}

async function getOffer(access, id) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/ITrade/GetOffer/v1?offer_id=${id}`);

        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getTradeURL(access) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/ITrade/GetTradeURL/v1/`);
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function regenerateTradeURL(access) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.post(`/ITrade/RegenerateTradeURL/v1/`);
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getUserInventory(access, uid, sort) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let a = await vgoAPI.get(`/ITrade/GetUserInventory/v1?uid=${uid}&app_id=1&sort=${sort}`);
        let b = await vgoAPI.get(`/ITrade/GetUserInventory/v1?uid=${uid}&app_id=12&sort=${sort}`);
        let c = await vgoAPI.get(`/ITrade/GetUserInventory/v1?uid=${uid}&app_id=7&sort=${sort}`);
        
        return { status: 200, res1: a.data.response, res2: b.data.response, res3: c.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getFavourite(access, uid) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/ITrade/GetUserInventory/v1?uid=${uid}&page=1&per_page=1&app_id=1&sort=1`);

        return { status: 200, res: response.data.response.user_data };
    } catch (error) {
        return error.response.data;
    }
}

async function sendOffer(access, tradeURL, tf, itemsSend, itemsReceive, message) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    
    try {
        let response = await vgoAPI.post(`/ITrade/SendOffer/v1`, {
            twofactor_code: tf,
            trade_url: tradeURL,
            items_to_send: itemsSend,
            items_to_receive: itemsReceive,
            message: message
        });
        if(response.data.status != 200) {
            return { status: 122, res: response.data.message };
        } else {
            return { status: 200, res: response.data.response };
        }
    } catch (error) {
        return error.response.data;
    }
}

async function acceptOffer(access, tf, offerID) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    
    try {
        let response = await vgoAPI.post(`/ITrade/AcceptOffer/v1`, {
            twofactor_code: tf,
            offer_id: offerID,
        });
        if(response.data.status == 122) {
            return response.data;
        } else {
            return { status: 200, res: response.data.response };
        }
    } catch (error) {
        return error.response.data;
    }
}

async function acceptGift(access, offerID) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });


    try {
        let response = await vgoAPI.post(`/ITrade/AcceptOffer/v1`, {
            offer_id: offerID,
        });
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function cancelOffer(access, offerID) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

   
    try {
        let response = await vgoAPI.post(`/ITrade/CancelOffer/v1`, {
            offer_id: offerID,
        });
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getInventory(access, sort) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let a = await vgoAPI.get(`/IUser/GetInventory/v1?app_id=1&sort=${sort}`);
        let b = await vgoAPI.get(`/IUser/GetInventory/v1?app_id=12&sort=${sort}`);
        let c = await vgoAPI.get(`/IUser/GetInventory/v1?app_id=7&sort=${sort}`);

        return { status: 200, res1: a.data.response, res2: b.data.response, res3: c.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function withdrawToOpskins(access, id) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });


    try {
        let response = await vgoAPI.post(`/IItem/WithdrawToOpskins/v1`, {
            item_id: id,
        });
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getProfile(access) {
 
    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/IUser/GetProfile/v1?with_extra=true`);
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
    
}

async function reportOffer(access, message, report, offerID) {

    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.post(`/IUser/UserReports/v1?message=${message}&report_type=${report}&offer_id=${offerID}`);
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getUser(code) {

    const vgoAPI = Axios.create({
        baseURL: "https://oauth.opskins.com",
        headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            Authorization: 'Basic XxXxXAPIKEYBASICXxXxX',
        },
    });

    try {
        let response = await vgoAPI.post(`/v1/access_token?grant_type=authorization_code`, {
            grant_type: "authorization_code",
            code: code
        });
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}

async function getItem(access, id) {
    const vgoAPI = Axios.create({
        baseURL: "https://api-trade.opskins.com",
        headers: {
            Authorization: 'Bearer ' + access.toString('base64'),
        },
    });

    try {
        let response = await vgoAPI.get(`/IItem/GetItemsById/v1?item_id=${id}`);
        return { status: 200, res: response.data.response };
    } catch (error) {
        return error.response.data;
    }
}