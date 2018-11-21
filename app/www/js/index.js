var app = {
    initialize: function() {
        this.bindEvents();

        if(localStorage.getItem('version') != "1.1.0") {
            localStorage.clear();
            localStorage.setItem("version", "1.1.0");
        }
        if(localStorage.getItem('notifications') == null) {
            localStorage.setItem('notifications', JSON.stringify([]));
        }
        if (localStorage.getItem('logindata') == null) {
            localStorage.setItem('logindata', JSON.stringify([]));
        }

        if (localStorage.getItem('loggedin') == null) {
            localStorage.setItem('loggedin', "");
        } else if (localStorage.getItem('loggedin') != ""){
            loggedin = localStorage.getItem('loggedin');
            if (JSON.parse(localStorage.getItem('logindata'))[loggedin].twoFactor != null) {
                ele('appoverlaycodebutton').style.display = "none";

                var tfItem = JSON.parse(localStorage.getItem('logindata'))[loggedin].twoFactor;

                ele("appoverlaycodeuser").innerHTML = `${tfItem.issuer} (${tfItem.name})`;

                totp = new OTPAuth.TOTP({
                    algorithm: 'SHA1',
                    digits: 6,
                    period: 30,
                    secret: OTPAuth.Secret.fromB32(stripSpaces(tfItem.secret)),
                });

                twoFactorSet = true;
            } else {
                ele('appoverlaycodebutton').style.display = "flex";
            }
        }

    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        document.addEventListener("backbutton", backKeyDown, true);
        document.addEventListener('touchmove', function (e) {
            if (e.changedTouches[0].clientX > coords[0] && e.changedTouches[0].clientY > coords[1] - 7 && e.changedTouches[0].clientY < coords[1] + 7) {
                swipeRight();
            } else if (e.changedTouches[0].clientX < coords[0] && e.changedTouches[0].clientY > coords[1] - 25 && e.changedTouches[0].clientY < coords[1] + 25) {
                // swipeLeft();
            }
        })
        document.addEventListener('touchstart', function (e) {
            coords = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
        })
        document.addEventListener('touchend', function (e) {
        })
        ele('appcontentmenu').addEventListener('click', function (event) {
            closeMenu();
            event.stopPropagation();
        })
        ele('appcontentmenuwrapper').addEventListener('click', function (event) {
            closeMenu();
            event.stopPropagation();
        })
    },
    receivedEvent: function(id) {
    }
};




// NOTE: Variables

var socket = io.connect('XxXxXServerIPXxXxX');

var loggedin = null;

var reftoken = null;
var acctoken = null;

var token = "";
var user;

var twoFactorSet = false;
var totp;

var coords = [];
var menuOpen = false;
var accountsshowing = false;

var selfinv = [];
var otherinv = [];

var selfsel = [];
var othersel = [];

var tradeuser = {};
var tradeuserurl = "";
var enteredMessage = "";





// NOTE: SOCKET

socket.on('connect', function (data) {
    ele('apploadingbarloader').setAttribute('loading', "");
    setTimeout(() => {

        try {
            var p = JSON.parse(localStorage.getItem('logindata'))[loggedin].token;
        } catch(e) {
            p = null;
        }

        if(loggedin === "" || p == null) {
            showLogin();
        } else {
            socket.emit('load token', JSON.parse(localStorage.getItem('logindata'))[loggedin].token);
        }

    }, 1000);
    socket.emit('socket join', socket.id);
});

socket.on("alert", function (data) {
    console.warn("--------------------\n", data, "\n--------------------");
})

socket.on("login token", function (data) {
    accountsshowing = false;
    if (data.status == 200) {
        user = data.res.user.user;
        if (user.avatar != null && user.avatar.toString().indexOf("_full") == -1) {
            user.avatar = user.avatar.substring(0, user.avatar.length - 4) + "_full.jpg";
        }

        var p = {
            access: data.res.auth.access_token,
            blacklist: [],
            favourites: [],
            friends: [],
            id: data.res.user.user.id,
            token: data.res.auth.refresh_token,
            twoFactor: null,
            user: user
        }
        reftoken = data.res.auth.refresh_token;
        acctoken = data.res.auth.access_token;
        var ld = JSON.parse(localStorage.getItem('logindata'));

        var c = ld.map(function (e) { return e.user.id; }).indexOf(user.id);

        if (c == -1) {
            ld.push(p);
            loggedin = ld.length - 1;
        } else {
            loggedin = c;
        }

        localStorage.setItem("loggedin", loggedin);

        localStorage.setItem("logindata", JSON.stringify(ld));
        ele('appcontentmenuimage').style.backgroundImage = "url('" + user.avatar + "')";
        ele('appcontentmenuname').innerHTML = user.display_name;
        ele('apploadingwrapper').style.display = "none";
        ele('appcontentwrapper').style.display = "block";
        socket.emit('offers get', { key: acctoken, sort: "created", state: 2, type: "received" });
        menuCheck(0);
        if (ld.twoFactor == null) {
            ele("appoverlaycodebutton").style.display = "flex";
        } else {
            twoFactorSet = true;
        }
        menuCheck(0);
    } else {
        
    }
})

socket.on("load token", function (data) {
    accountsshowing = false;
    if (data.status == 200) {
        var ld = JSON.parse(localStorage.getItem('logindata'));

        ld.forEach((element, index) => {
            if(element.id == data.res.user.user.id) {
                loggedin = index;
            }
        });

        ld[loggedin].access = data.res.auth.access_token;

        reftoken = ld[loggedin].token;
        acctoken = ld[loggedin].access;

        user = data.res.user.user;
        if (user.avatar != null && user.avatar.toString().indexOf("_full") == -1) {
            user.avatar = user.avatar.substring(0, user.avatar.length - 4) + "_full.jpg";
        }

        ld[loggedin].user = user;

        localStorage.setItem("logindata", JSON.stringify(ld));
        ele('appcontentmenuimage').style.backgroundImage = "url('" + user.avatar + "')";
        ele('appcontentmenuname').innerHTML = user.display_name;
        ele('apploadingwrapper').style.display = "none";
        ele('appcontentwrapper').style.display = "block";
        socket.emit('offers get', { key: acctoken, sort: "created", state: 2, type: "received" });
        menuCheck(0);

        var list = JSON.parse(localStorage.getItem('logindata'));

        var datas = [];

        list.forEach((element, index) => {
            if (loggedin === index) {
                datas.push({ loggedin: true, token: acctoken, id: element.user.id });
            } else {
                datas.push({ loggedin: false, token: element.token, id: element.user.id });
            }
        })

        socket.emit("accounts pending", datas);
    } else {
        showLogin();
    }
})

socket.on("refresh token", function(data) {

    if (data.status == 200) {
        var ld = JSON.parse(localStorage.getItem('logindata'));

        ld[loggedin].access = data.res.access_token;
        acctoken = data.res.access_token;

        localStorage.setItem("logindata", JSON.stringify(ld));

    } else {
        showLogin();
    }
})

socket.on('offer update', function (data) {
    ele("appmodalwrapper").style.display = "none";
    ele('currentpagemeta').setAttribute('content', 'offer');
    ele('appcontentleft').innerHTML = "arrow_back";
    ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
    

    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    var isFav = false;
    if (!fav.includes(data.res.offer.sender.uid)) {
        ele('appcontentright').innerHTML = "star_border";
        ele('appcontentright').setAttribute("onclick", "checkFavourite(" + data.res.offer.sender.uid + ", " + data.res.offer.id + ", 'base')");
    } else {
        isFav = true;
        ele('appcontentright').innerHTML = "star";
        ele('appcontentright').setAttribute("onclick", "uncheckFavourite(" + data.res.offer.sender.uid + ", " + data.res.offer.id + ", 'base')");
    }
    ele('appcontentright').style.display = "block";

    ele('appcontenttitle').innerHTML = "Offer #" + data.res.offer.id;

    var HTML = ``;
    var element = data.res.offer;

    if(element.is_case_opening == true) {
        backKeyDown();
        return;
    }

    var info = "";

    if (element.sender.avatar != null && element.sender.avatar.toString().indexOf("_full") == -1) {
        element.sender.avatar = element.sender.avatar.substring(0, element.sender.avatar.length - 4) + "_full.jpg";
    }

    if (element.is_gift == true) {
        info = "Has a gift for you"
    } else if (element.sender.items.length == 0 && element.recipient.items.length != 0) {
        info = "Requests a gift from you"
    } else {
        switch (element.recipient.items.length) {
            case 1:
                info = `Send ${element.recipient.items.length} item and`;
                break;

            default:
                info = `Send ${element.recipient.items.length} items and`;
                break;
        }
        switch (element.sender.items.length) {
            case 1:
                info += ` receive ${element.sender.items.length} item`;
                break;

            default:
                info += ` receive ${element.sender.items.length} items`;
                break;
        }
    }


    if (element.state == 2) {

        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else if (element.state == 3) {

        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="imgx_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    }

    var price1 = 0.00;
    var price2 = 0.00;

    var info1 = "";
    var info2 = "";

    switch (data.res.offer.sender.items.length) {
        case 1:
            info2 = `Their Items (${data.res.offer.sender.items.length} Skin)`;
            break;

        default:
            info2 = `Their Items (${data.res.offer.sender.items.length} Skins)`;
            break;
    }

    switch (data.res.offer.recipient.items.length) {
        case 1:
            info1 = `Your Items (${data.res.offer.recipient.items.length} Skin)`;
            break;

        default:
            info1 = `Your Items (${data.res.offer.recipient.items.length} Skins)`;
            break;
    }

    data.res.offer.sender.items.forEach(e => {
        price2 += e.suggested_price / 100;
    });

    data.res.offer.recipient.items.forEach(e => {
        price1 += e.suggested_price / 100;
    });

    if(element.message != "") {
        HTML += `
        <div class="trademessage">
            <i class="material-icons trademessageicon">email</i>    
            <h1 class="trademessagetext">${element.message}</h1>
        </div>
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    } else {
        HTML += `
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    }

    

    data.res.offer.sender.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" sent onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    HTML += `
        <div class="tradeitemshead" received>
            <h1 class="tradeitemsheadleft">$${parseFloat(price1).toFixed(2)}</h1>
            <h1 class="tradeitemsheadright">${info1}</h1>
        </div>
    `;

    data.res.offer.recipient.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" received onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    if (!bl.includes(data.res.offer.sender.uid)) {
        HTML += `</div><div class="tradeblacklist" id="tradeblacklist" onclick="checkBlacklist(${element.sender.uid})">
                    Blacklist this User
                </div>
                <h1 class="tradeblacklistinfo" id="tradeblacklistinfo">If you Blacklist this User, this and all future Incoming trades from this User will be declined automatically. You can always find your Blacklist under Settings.</h1>`
    } else {
        HTML += `</div><h1 class="tradeblacklistinfo">This User is blacklisted! Visit the Settings to unblock this User.</h1>`;
    }

    ele('appcontentinner').innerHTML = HTML;

})

socket.on('offer update re', function(data) {
    ele("appmodalwrapper").style.display = "none";
    ele('currentpagemeta').setAttribute('content', 'offer');

    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    var isFav = false;
    if (!fav.includes(data.res.offer.recipient.uid)) {
        ele('appcontentright').innerHTML = "star_border";
        ele('appcontentright').setAttribute("onclick", "checkFavourite(" + data.res.offer.recipient.uid + ", " + data.res.offer.id + ", 're')");
    } else {
        isFav = true;
        ele('appcontentright').innerHTML = "star";
        ele('appcontentright').setAttribute("onclick", "uncheckFavourite(" + data.res.offer.recipient.uid + ", " + data.res.offer.id + ", 're')");
    }
    ele('appcontentright').style.display = "block";

    ele('appcontentleft').innerHTML = "arrow_back";
    ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
    ele('appcontenttitle').innerHTML = "Offer #" + data.res.offer.id;

    var HTML = ``;
    var element = data.res.offer;

    var info = "";

    if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
        element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
    }

    if (element.is_gift == true) {
        info = "You sent a gift"
    } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
        info = "Has a gift for you"
    } else {
        switch (element.sender.items.length) {
            case 1:
                info = `Send ${element.sender.items.length} item and`;
                break;

            default:
                info = `Send ${element.sender.items.length} items and`;
                break;
        }
        switch (element.recipient.items.length) {
            case 1:
                info += ` receive ${element.recipient.items.length} item`;
                break;

            default:
                info += ` receive ${element.recipient.items.length} items`;
                break;
        }
    }


    if (element.state == 2) {

        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else if (element.state == 3) {

        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    }

    var price1 = 0.00;
    var price2 = 0.00;

    var info1 = "";
    var info2 = "";

    switch (data.res.offer.recipient.items.length) {
        case 1:
            info2 = `Their Items (${data.res.offer.recipient.items.length} Skin)`;
            break;

        default:
            info2 = `Their Items (${data.res.offer.recipient.items.length} Skins)`;
            break;
    }

    switch (data.res.offer.sender.items.length) {
        case 1:
            info1 = `Your Items (${data.res.offer.sender.items.length} Skin)`;
            break;

        default:
            info1 = `Your Items (${data.res.offer.sender.items.length} Skins)`;
            break;
    }

    data.res.offer.recipient.items.forEach(e => {
        price2 += e.suggested_price / 100;
    });

    data.res.offer.sender.items.forEach(e => {
        price1 += e.suggested_price / 100;
    });

    if (element.message != "") {
        HTML += `
        <div class="trademessage">
            <i class="material-icons trademessageicon">email</i>    
            <h1 class="trademessagetext">${element.message}</h1>
        </div>
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    } else {
        HTML += `
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    }



    data.res.offer.recipient.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" sent onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    HTML += `
        <div class="tradeitemshead" received>
            <h1 class="tradeitemsheadleft">$${parseFloat(price1).toFixed(2)}</h1>
            <h1 class="tradeitemsheadright">${info1}</h1>
        </div>
    `;

    data.res.offer.sender.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" received onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    if (!bl.includes(data.res.offer.recipient.uid)) {
        HTML += `</div><div class="tradeblacklist" id="tradeblacklist" onclick="checkBlacklist(${element.recipient.uid})">
                    Blacklist this User
                </div>
                <h1 class="tradeblacklistinfo" id="tradeblacklistinfo">If you Blacklist this User, this and all future Incoming trades from this User will be declined automatically. You can always find your Blacklist under Settings.</h1>`
    } else {
        HTML += `</div><h1 class="tradeblacklistinfo">This User is blacklisted! Visit the Settings to unblock this User.</h1>`;
    }

    ele('appcontentinner').innerHTML = HTML;

})

socket.on('offers sent all', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers sent all');
    ele('appcontenttitle').innerHTML = "Sent: All";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.recipient.uid)) {
            isFav = true;
        }

        if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
            element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "You sent a gift"
        } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
            info = "Has a gift for you"
        } else {
            switch (element.sender.items.length) {
                case 1:
                    info = `Send ${element.sender.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.sender.items.length} items and`;
                    break;
            }
            switch (element.recipient.items.length) {
                case 1:
                    info += ` receive ${element.recipient.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.recipient.items.length} items`;
                    break;
            }
        }

        if (element.state == 2) {
            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.recipient.verified == true) {
                HTML += `<div class="trade" auth pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            }
        } else if (element.state == 3) {
            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.recipient.verified == true) {
                HTML += `<div class="trade" auth accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            }
        } else {
            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.recipient.verified == true) {
                HTML += `<div class="trade" auth declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            }
        }

    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers sent canceled', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers sent canceled');
    ele('appcontenttitle').innerHTML = "Sent: Canceled";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.recipient.uid)) {
            isFav = true;
        }

        if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
            element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "You sent a gift"
        } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
            info = "Has a gift for you"
        } else {
            switch (element.sender.items.length) {
                case 1:
                    info = `Send ${element.sender.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.sender.items.length} items and`;
                    break;
            }
            switch (element.recipient.items.length) {
                case 1:
                    info += ` receive ${element.recipient.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.recipient.items.length} items`;
                    break;
            }
        }

        if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user declined onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers sent accepted', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers sent accepted');
    ele('appcontenttitle').innerHTML = "Sent: Accepted";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.recipient.uid)) {
            isFav = true;
        }

        if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
            element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "You sent a gift"
        } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
            info = "Has a gift for you"
        } else {
            switch (element.sender.items.length) {
                case 1:
                    info = `Send ${element.sender.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.sender.items.length} items and`;
                    break;
            }
            switch (element.recipient.items.length) {
                case 1:
                    info += ` receive ${element.recipient.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.recipient.items.length} items`;
                    break;
            }
        }

        if(isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user accepted onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers sent pending', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers sent pending');
    ele('appcontenttitle').innerHTML = "Sent: Pending";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.recipient.uid)) {
            isFav = true;
        }

        if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
            element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "You sent a gift"
        } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
            info = "Has a gift for you"
        } else {
            switch (element.sender.items.length) {
                case 1:
                    info = `Send ${element.sender.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.sender.items.length} items and`;
                    break;
            }
            switch (element.recipient.items.length) {
                case 1:
                    info += ` receive ${element.recipient.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.recipient.items.length} items`;
                    break;
            }
        }

        if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user pending onclick="openOfferRe(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers got all', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers received all');
    ele('appcontenttitle').innerHTML = "Received: All";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.sender.uid)) {
            isFav = true;
        }

        if (element.sender.avatar != null && element.sender.avatar.toString().indexOf("_full") == -1) {
            element.sender.avatar = element.sender.avatar.substring(0, element.sender.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "Has a gift for you"
        } else if (element.sender.items.length == 0 && element.recipient.items.length != 0) {
            info = "Requests a gift from you"
        } else {
            switch (element.recipient.items.length) {
                case 1:
                    info = `Send ${element.recipient.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.recipient.items.length} items and`;
                    break;
            }
            switch (element.sender.items.length) {
                case 1:
                    info += ` receive ${element.sender.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.sender.items.length} items`;
                    break;
            }
        }

        if(element.state == 9) {

            switch (element.recipient.items.length) {
                case 1:
                    info = "1 Case"
                    break;
            
                default:
                    info = element.recipient.items.length + " Cases"
                    break;
            }

            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">Pending Case Opening - ${info}</h1>
                        </div>
                    </div>`;
            } else if (element.sender.verified == true) {
                HTML += `<div class="trade" auth pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">Pending Case Opening - ${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">Pending Case Opening - ${info}</h1>
                        </div>
                    </div>`;
            }
        } else if(element.state == 2) {
            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.sender.verified == true) {
                HTML += `<div class="trade" auth pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user pending onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            }
        } else if(element.state == 3) {
            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.sender.verified == true) {
                HTML += `<div class="trade" auth accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            }
        } else {
            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else if (element.sender.verified == true) {
                HTML += `<div class="trade" auth declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            } else {
                HTML += `<div class="trade" user declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
            }
        }
        
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers got canceled', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers received canceled');
    ele('appcontenttitle').innerHTML = "Received: Canceled";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.sender.uid)) {
            isFav = true;
        }

        if (element.sender.avatar != null && element.sender.avatar.toString().indexOf("_full") == -1) {
            element.sender.avatar = element.sender.avatar.substring(0, element.sender.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "Has a gift for you"
        } else if (element.sender.items.length == 0 && element.recipient.items.length != 0) {
            info = "Requests a gift from you"
        } else {
            switch (element.recipient.items.length) {
                case 1:
                    info = `Send ${element.recipient.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.recipient.items.length} items and`;
                    break;
            }
            switch (element.sender.items.length) {
                case 1:
                    info += ` receive ${element.sender.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.sender.items.length} items`;
                    break;
            }
        }

        if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user declined onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers got accepted', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offers received accepted');
    ele('appcontenttitle').innerHTML = "Received: Accepted";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

        var isFav = false;
        if (fav.includes(element.sender.uid)) {
            isFav = true;
        }

        if (element.sender.avatar != null && element.sender.avatar.toString().indexOf("_full") == -1) {
            element.sender.avatar = element.sender.avatar.substring(0, element.sender.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "Has a gift for you"
        } else if (element.sender.items.length == 0 && element.recipient.items.length != 0) {
            info = "Requests a gift from you"
        } else {
            switch (element.recipient.items.length) {
                case 1:
                    info = `Send ${element.recipient.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.recipient.items.length} items and`;
                    break;
            }
            switch (element.sender.items.length) {
                case 1:
                    info += ` receive ${element.sender.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.sender.items.length} items`;
                    break;
            }
        }

        if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user accepted onclick="openOffer(${element.id});">
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('offers got pending', function (data) {
    ele('appcontentright').innerHTML = "";
    ele('appcontentright').style.display = "none";
    ele('currentpagemeta').setAttribute('content', 'offers received pending');
    ele('appcontenttitle').innerHTML = "Received: Pending";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    var HTML = ``;
    data.res.offers.forEach(element => {

        var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;
        var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

        var isFav = false;
        if (fav.includes(element.sender.uid)) {
            isFav = true;
        }

        var isBanned = false;
        if (bl.includes(element.sender.uid)) {
            isBanned = true;
        }

        if(!isBanned) {

            if (element.sender.avatar != null && element.sender.avatar.toString().indexOf("_full") == -1) {
                element.sender.avatar = element.sender.avatar.substring(0, element.sender.avatar.length - 4) + "_full.jpg";
            }

            var info = "";

            if (element.is_gift == true) {
                info = "Has a gift for you"
            } else if (element.sender.items.length == 0 && element.recipient.items.length != 0) {
                info = "Requests a gift from you"
            } else {
                switch (element.recipient.items.length) {
                    case 1:
                        info = `Send ${element.recipient.items.length} item and`;
                        break;

                    default:
                        info = `Send ${element.recipient.items.length} items and`;
                        break;
                }
                switch (element.sender.items.length) {
                    case 1:
                        info += ` receive ${element.sender.items.length} item`;
                        break;

                    default:
                        info += ` receive ${element.sender.items.length} items`;
                        break;
                }
            }

            if (isFav && element.is_case_opening == true) {
                HTML += `<div class="trade" fav vcase pending onclick="openOffer(${element.id});">
                            <div class="tradecontent">
                                <div class="tradeavatar"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/fav.svg" alt="">
                                <h1 class="tradeuser">${element.sender.display_name}</h1>
                                <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else if (isFav && element.is_case_opening == false) {
                HTML += `<div class="trade" fav user pending onclick="openOffer(${element.id});">
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="" alt="">
                                </div>
                                <img class="tradeauth" src="img/fav.svg" alt="">
                                <h1 class="tradeuser">${element.sender.display_name}</h1>
                                <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase pending onclick="openOffer(${element.id});">
                            <div class="tradecontent">
                                <div class="tradeavatar"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                                <h1 class="tradeuser">${element.sender.display_name}</h1>
                                <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else if (element.sender.verified == true) {
                HTML += `<div class="trade" auth pending onclick="openOffer(${element.id});">
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="" alt="">
                                </div>
                                <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                                <h1 class="tradeuser">${element.sender.display_name}</h1>
                                <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else {
                HTML += `<div class="trade" user pending onclick="openOffer(${element.id});">
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="" alt="">
                                </div>
                                <img class="tradeauth" src="" alt="">
                                <h1 class="tradeuser">${element.sender.display_name}</h1>
                                <h1 class="tradetime">${getDate(element.time_created) + " - " + getTime(element.time_created)}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            }
        } else {
            socket.emit('offer decline blacklist', { key: acctoken, id: element.id });
        }
    })

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('trade init', function (data) {
    if(data.res.status == 200 && data.inv.status == 200) {
        ele('currentpagemeta').setAttribute('content', 'trade detail');
        ele('appcontentleft').innerHTML = "arrow_back";
        ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
        ele('appcontenttitle').innerHTML = "Trade";

        var HTML = ``;
        var element = data.res.res;
        tradeuser = data.res.res.user_data;
        tradeuserurl = data.url;

        selfinv = data.inv.res.items;
        otherinv = data.res.res.items;

        selfsel = [];
        othersel = [];
        enteredMessage = "";

        selfinv.forEach(() => {
            selfsel.push(false);
        });

        otherinv.forEach(() => {
            othersel.push(false);
        })

        if (element.user_data.avatar != null && element.user_data.avatar.toString().indexOf("_full") == -1) {
            element.user_data.avatar = element.user_data.avatar.substring(0, element.user_data.avatar.length - 4) + "_full.jpg";
        }

        HTML += `<div class="trade" user creating>
                    <div class="tradecontent">
                        <div class="tradeavatar" style="background-image: url(${element.user_data.avatar});"></div>
                        <div class="tradestatus">
                            <img class="tradestatusimg" src="" alt="">
                        </div>
                        <img class="tradeauth" src="" alt="">
                        <h1 class="tradeuser">${element.user_data.username}</h1>
                        <div class="tradedecline" onclick="cancelTrade()">
                            <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                        </div>
                        <div class="tradeaccept" onclick="sendTrade('${data.url}')">
                            <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                        </div>
                        <h1 class="tradeinfo">You want to trade</h1>
                    </div>
                </div>`;

        var price1 = 0.00;
        var price2 = 0.00;

        var info1 = "Your Items (0 Skins)";
        var info2 = "Their Items (0 Skins)";

        HTML += `
            <div class="trademessage">
                <i class="material-icons trademessageicon">email</i>    
                <div class="trademessagetext" id="trademessagetext" contenteditable="true" style="min-width: 30px; text-overflow: unset !important;">Enter Message here...</div>
            </div>
            <div class="tradeitems">
                <div class="tradeitemshead">
                    <h1 class="tradeitemsheadleft">${info1}</h1>
                    <h1 class="tradeitemsheadright">$${parseFloat(price1).toFixed(2)}</h1>
                </div>
                <div class="tradeplus" onclick="selfSelect();">
                    <img class="tradeplusimg" src="img/button_plus.svg" alt="">
                </div>
                <div class="tradeitemshead" received >
                    <h1 class="tradeitemsheadleft">$${parseFloat(price2).toFixed(2)}</h1>
                    <h1 class="tradeitemsheadright">${info2}</h1>
                </div>
                <div class="tradeplus" onclick="otherSelect();">
                <img class="tradeplusimg" src="img/button_plus.svg" alt="">
            </div>
            </div>
        `;

        ele('appcontentinner').innerHTML = HTML;
        loadingEnded();
    }
})

socket.on('trade send', function (data) {
    if(data.status == 200) {
        menuCheck(4);
        ele('currentpagemeta').setAttribute('content', 'offer');
        ele('appcontentleft').innerHTML = "arrow_back";
        ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
        ele('appcontenttitle').innerHTML = "Offer #" + data.res.offer.id;

        var HTML = ``;
        var element = data.res.offer;

        if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
            element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
        }

        var info = "";

        if (element.is_gift == true) {
            info = "You sent a gift"
        } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
            info = "Has a gift for you"
        } else {
            switch (element.sender.items.length) {
                case 1:
                    info = `Send ${element.sender.items.length} item and`;
                    break;

                default:
                    info = `Send ${element.sender.items.length} items and`;
                    break;
            }
            switch (element.recipient.items.length) {
                case 1:
                    info += ` receive ${element.recipient.items.length} item`;
                    break;

                default:
                    info += ` receive ${element.recipient.items.length} items`;
                    break;
            }
        }

        if (element.state == 2) {

            if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase pending>
                            <div class="tradecontent">
                                <div class="tradeavatar"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                    <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                                </div>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else if (element.recipient.verified == true) {
                HTML += `<div class="trade" auth pending>
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="" alt="">
                                </div>
                                <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                    <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                                </div>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else {
                HTML += `<div class="trade" user pending>
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="" alt="">
                                </div>
                                <img class="tradeauth" src="" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                    <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                                </div>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            }
        } else if (element.state == 3) {

            if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase accepted>
                            <div class="tradecontent">
                                <div class="tradeavatar"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/check_big.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else if (element.recipient.verified == true) {
                HTML += `<div class="trade" auth accepted>
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/check_small.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else {
                HTML += `<div class="trade" user accepted>
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/check_small.svg" alt="">
                                </div>
                                <img class="tradeauth" src="" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            }
        } else {
            if (element.is_case_opening == true) {
                HTML += `<div class="trade" vcase declined>
                            <div class="tradecontent">
                                <div class="tradeavatar"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/x_big.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/vcase_declined.png" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else if (element.recipient.verified == true) {
                HTML += `<div class="trade" auth declined>
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/x_small.svg" alt="">
                                </div>
                                <img class="tradeauth" src="img/auth_declined.svg" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            } else {
                HTML += `<div class="trade" user declined>
                            <div class="tradecontent">
                                <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                                <div class="tradestatus">
                                    <img class="tradestatusimg" src="img/x_small.svg" alt="">
                                </div>
                                <img class="tradeauth" src="" alt="">
                                <h1 class="tradeuser">${element.recipient.display_name}</h1>
                                <h1 class="tradeinfo">${info}</h1>
                            </div>
                        </div>`;
            }
        }

        var price1 = 0.00;
        var price2 = 0.00;

        var info1 = "";
        var info2 = "";

        switch (data.res.offer.recipient.items.length) {
            case 1:
                info2 = `Their Items (${data.res.offer.recipient.items.length} Skin)`;
                break;

            default:
                info2 = `Their Items (${data.res.offer.recipient.items.length} Skins)`;
                break;
        }

        switch (data.res.offer.sender.items.length) {
            case 1:
                info1 = `Your Items (${data.res.offer.sender.items.length} Skin)`;
                break;

            default:
                info1 = `Your Items (${data.res.offer.sender.items.length} Skins)`;
                break;
        }

        data.res.offer.recipient.items.forEach(e => {
            price2 += e.suggested_price / 100;
        });

        data.res.offer.sender.items.forEach(e => {
            price1 += e.suggested_price / 100;
        });

        if (element.message != "") {
            HTML += `
            <div class="trademessage">
                <i class="material-icons trademessageicon">email</i>    
                <h1 class="trademessagetext">${element.message}</h1>
            </div>
            <div class="tradeitems">
                <div class="tradeitemshead">
                    <h1 class="tradeitemsheadleft">${info2}</h1>
                    <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
                </div>
        `;
        } else {
            HTML += `
            <div class="tradeitems">
                <div class="tradeitemshead">
                    <h1 class="tradeitemsheadleft">${info2}</h1>
                    <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
                </div>
        `;
        }

        data.res.offer.recipient.items.forEach(e => {
            HTML += `   
                <div class="tradeitem ${e.rarity}" sent>
                    <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                    <h1 class="tradeitemname">${e.name}</h1>
                    <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                    <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                </div>
            `;
        });

        HTML += `
            <div class="tradeitemshead" received>
                <h1 class="tradeitemsheadleft">$${parseFloat(price1).toFixed(2)}</h1>
                <h1 class="tradeitemsheadright">${info1}</h1>
            </div>
        `;

        data.res.offer.sender.items.forEach(e => {
            HTML += `   
                <div class="tradeitem ${e.rarity}" received>
                    <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                    <h1 class="tradeitemname">${e.name}</h1>
                    <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                    <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                </div>
            `;
        });

        var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

        if (!bl.includes(data.res.offer.recipient.uid)) {
            HTML += `</div><div class="tradeblacklist" id="tradeblacklist" onclick="checkBlacklist(${element.recipient.uid})">
                    Blacklist this User
                </div>
                <h1 class="tradeblacklistinfo" id="tradeblacklistinfo">If you Blacklist this User, this and all future Incoming trades from this User will be declined automatically. You can always find your Blacklist under Settings.</h1>`
        } else {
            HTML += `</div><h1 class="tradeblacklistinfo">This User is blacklisted! Visit the Settings to unblock this User.</h1>`;
        }

        ele('appcontentinner').innerHTML = HTML;
        loadingEnded();
    } else {
        getOffers(0, 2, 0);
        menuCheck(0);
    }
})


socket.on('offer detail', function (data) {
    ele('currentpagemeta').setAttribute('content', 'offer');

    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    var isFav = false;
    if (!fav.includes(data.res.offer.sender.uid)) {
        ele('appcontentright').innerHTML = "star_border";
        ele('appcontentright').setAttribute("onclick", "checkFavourite(" + data.res.offer.sender.uid + ", " + data.res.offer.id + ", 'base')");
    } else {
        isFav = true;
        ele('appcontentright').innerHTML = "star";
        ele('appcontentright').setAttribute("onclick", "uncheckFavourite(" + data.res.offer.sender.uid + ", " + data.res.offer.id + ", 'base')");
    }
    ele('appcontentright').style.display = "block";

    ele('appcontentleft').innerHTML = "arrow_back";
    ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
    ele('appcontenttitle').innerHTML = "Offer #" + data.res.offer.id;

    var HTML = ``;
    var element = data.res.offer;

    if (element.sender.avatar != null && element.sender.avatar.toString().indexOf("_full") == -1) {
        element.sender.avatar = element.sender.avatar.substring(0, element.sender.avatar.length - 4) + "_full.jpg";
    }

    var info = "";

    if (element.is_gift == true) {
        info = "Has a gift for you"
    } else if (element.sender.items.length == 0 && element.recipient.items.length != 0) {
        info = "Requests a gift from you"
    } else {
        switch (element.recipient.items.length) {
            case 1:
                info = `Send ${element.recipient.items.length} item and`;
                break;

            default:
                info = `Send ${element.recipient.items.length} items and`;
                break;
        }
        switch (element.sender.items.length) {
            case 1:
                info += ` receive ${element.sender.items.length} item`;
                break;

            default:
                info += ` receive ${element.sender.items.length} items`;
                break;
        }
    }

    if (element.state == 2) {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <div class="tradedecline" onclick="declineOffer(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <div class="tradeaccept" onclick="acceptOffer(${element.id}, ${element.is_gift})">
                                <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else if (element.state == 3) {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.sender.verified == true) {
            HTML += `<div class="trade" auth declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.sender.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.sender.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    }

    var price1 = 0.00;
    var price2 = 0.00;

    var info1 = "";
    var info2 = "";

    switch (data.res.offer.sender.items.length) {
        case 1:
            info2 = `Their Items (${data.res.offer.sender.items.length} Skin)`;
            break;

        default:
            info2 = `Their Items (${data.res.offer.sender.items.length} Skins)`;
            break;
    }

    switch (data.res.offer.recipient.items.length) {
        case 1:
            info1 = `Your Items (${data.res.offer.recipient.items.length} Skin)`;
            break;

        default:
            info1 = `Your Items (${data.res.offer.recipient.items.length} Skins)`;
            break;
    }

    data.res.offer.sender.items.forEach(e => {
        price2 += e.suggested_price / 100;
    });

    data.res.offer.recipient.items.forEach(e => {
        price1 += e.suggested_price / 100;
    });

    if (element.message != "") {
        HTML += `
        <div class="trademessage">
            <i class="material-icons trademessageicon">email</i>    
            <h1 class="trademessagetext">${element.message}</h1>
        </div>
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    } else {
        HTML += `
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    }

    data.res.offer.sender.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" sent onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    HTML += `
        <div class="tradeitemshead" received>
            <h1 class="tradeitemsheadleft">$${parseFloat(price1).toFixed(2)}</h1>
            <h1 class="tradeitemsheadright">${info1}</h1>
        </div>
    `;

    data.res.offer.recipient.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" received onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    if (!bl.includes(data.res.offer.sender.uid)) {
        HTML += `</div><div class="tradeblacklist" id="tradeblacklist" onclick="checkBlacklist(${element.sender.uid})">
                    Blacklist this User
                </div>
                <h1 class="tradeblacklistinfo" id="tradeblacklistinfo">If you Blacklist this User, this and all future Incoming trades from this User will be declined automatically. You can always find your Blacklist under Settings.</h1>`
    } else {
        HTML += `</div><h1 class="tradeblacklistinfo">This User is blacklisted! Visit the Settings to unblock this User.</h1>`;
    }

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();

})

socket.on('offer detail re', function(data) {
    ele('currentpagemeta').setAttribute('content', 'offer');

    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    var isFav = false;
    if (!fav.includes(data.res.offer.recipient.uid)) {
        ele('appcontentright').innerHTML = "star_border";
        ele('appcontentright').setAttribute("onclick", "checkFavourite(" + data.res.offer.recipient.uid + ", " + data.res.offer.id + ", 're')");
    } else {
        isFav = true;
        ele('appcontentright').innerHTML = "star";
        ele('appcontentright').setAttribute("onclick", "uncheckFavourite(" + data.res.offer.recipient.uid + ", " + data.res.offer.id + ", 're')");
    }
    ele('appcontentright').style.display = "block";

    ele('appcontentleft').innerHTML = "arrow_back";
    ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
    ele('appcontenttitle').innerHTML = "Offer #" + data.res.offer.id;

    var HTML = ``;
    var element = data.res.offer;

    if (element.recipient.avatar != null && element.recipient.avatar.toString().indexOf("_full") == -1) {
        element.recipient.avatar = element.recipient.avatar.substring(0, element.recipient.avatar.length - 4) + "_full.jpg";
    }

    var info = "";

    if (element.is_gift == true) {
        info = "You sent a gift"
    } else if (element.recipient.items.length != 0 && element.sender.items.length == 0) {
        info = "Has a gift for you"
    } else {
        switch (element.sender.items.length) {
            case 1:
                info = `Send ${element.sender.items.length} item and`;
                break;

            default:
                info = `Send ${element.sender.items.length} items and`;
                break;
        }
        switch (element.recipient.items.length) {
            case 1:
                info += ` receive ${element.recipient.items.length} item`;
                break;

            default:
                info += ` receive ${element.recipient.items.length} items`;
                break;
        }
    }

    if (element.state == 2) {

        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase pending>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/waiting_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_waiting.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_waiting.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user pending>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <div class="tradedecline re" onclick="declineOfferRe(${element.id})">
                                <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                            </div>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else if (element.state == 3) {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_accepted.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_accepted.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user accepted>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/check_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    } else {
        if (isFav && element.is_case_opening == false) {
            HTML += `<div class="trade" fav user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (isFav && element.is_case_opening == true) {
            HTML += `<div class="trade" fav vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/fav.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.is_case_opening == true) {
            HTML += `<div class="trade" vcase declined>
                        <div class="tradecontent">
                            <div class="tradeavatar"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_big.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/vcase_declined.png" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else if (element.recipient.verified == true) {
            HTML += `<div class="trade" auth declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="img/auth_declined.svg" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        } else {
            HTML += `<div class="trade" user declined>
                        <div class="tradecontent">
                            <div class="tradeavatar" style="background-image: url(${element.recipient.avatar});"></div>
                            <div class="tradestatus">
                                <img class="tradestatusimg" src="img/x_small.svg" alt="">
                            </div>
                            <img class="tradeauth" src="" alt="">
                            <h1 class="tradeuser">${element.recipient.display_name}</h1>
                            <h1 class="tradeinfo">${info}</h1>
                        </div>
                    </div>`;
        }
    }

    var price1 = 0.00;
    var price2 = 0.00;

    var info1 = "";
    var info2 = "";

    switch (data.res.offer.recipient.items.length) {
        case 1:
            info2 = `Their Items (${data.res.offer.recipient.items.length} Skin)`;
            break;

        default:
            info2 = `Their Items (${data.res.offer.recipient.items.length} Skins)`;
            break;
    }

    switch (data.res.offer.sender.items.length) {
        case 1:
            info1 = `Your Items (${data.res.offer.sender.items.length} Skin)`;
            break;

        default:
            info1 = `Your Items (${data.res.offer.sender.items.length} Skins)`;
            break;
    }

    data.res.offer.recipient.items.forEach(e => {
        price2 += e.suggested_price / 100;
    });

    data.res.offer.sender.items.forEach(e => {
        price1 += e.suggested_price / 100;
    });

    if (element.message != "") {
        HTML += `
        <div class="trademessage">
            <i class="material-icons trademessageicon">email</i>    
            <h1 class="trademessagetext">${element.message}</h1>
        </div>
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    } else {
        HTML += `
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info2}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price2).toFixed(2)}</h1>
            </div>
    `;
    }

    data.res.offer.recipient.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" sent onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    HTML += `
        <div class="tradeitemshead" received>
            <h1 class="tradeitemsheadleft">$${parseFloat(price1).toFixed(2)}</h1>
            <h1 class="tradeitemsheadright">${info1}</h1>
        </div>
    `;

    data.res.offer.sender.items.forEach(e => {
        HTML += `   
            <div class="tradeitem ${e.rarity}" received onclick="showItem(${e.id});">
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
    });

    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    if (!bl.includes(data.res.offer.recipient.uid)) {
        HTML += `</div><div class="tradeblacklist" id="tradeblacklist" onclick="checkBlacklist(${element.recipient.uid})">
                    Blacklist this User
                </div>
                <h1 class="tradeblacklistinfo" id="tradeblacklistinfo">If you Blacklist this User, this and all future Incoming trades from this User will be declined automatically. You can always find your Blacklist under Settings.</h1>`
    } else {
        HTML += `</div><h1 class="tradeblacklistinfo">This User is blacklisted! Visit the Settings to unblock this User.</h1>`;
    }

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();

})

socket.on('inventory show', function (data) {
    ele('currentpagemeta').setAttribute('content', 'inventory');
    ele('appcontenttitle').innerHTML = "Inventory ($0.00)";

    var HTML = ``;

    var price1 = 0.00;

    data.res.items.forEach(e => {

        price1 += e.suggested_price / 100;
        HTML += `   
            <div class="invitem ${e.rarity}" onclick="showItem(${e.id});">
                <div class="invitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="invitemname">${e.name}</h1>
                <h1 class="inviteminfo">Wear: <b class="inviteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="inviteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="invitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                <div class="itembar"></div>
            </div>
        `;
    });

    ele('appcontenttitle').innerHTML = "Inventory ($" + parseFloat(price1).toFixed(2) + ")";
    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('settings open', function (data) {
    ele('appcontenttitle').innerHTML = "Settings";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");
    ele('currentpagemeta').setAttribute('content', 'settings');

    if(twoFactorSet == true) {
        var HTML = `
        <div class="settingswrapper">
            <h1 class="settingshead1">Your ExpressTrade URL</h1>
            <input type="text" value="${data.url.res.short_url}" class="settingsurl" id="settingsurl" onclick="copyURL();" readonly></input>
            <h1 class="settingshead2">TwoFactor</h1>
            <h1 class="settingssubhead1">Use TwoFactor directly in our App by completing a few simple steps.</h1>
            <div class="settingsdisable" id="settingsdisable" onclick="disableTwoFactor();">Disable TwoFactor</div>
            <h1 class="settingshead3">User</h1>
            <div class="settingslogout" onclick="logoutUser();">Logout</div>
        </div>
    `
    } else {
        var HTML = `
        <div class="settingswrapper">
            <h1 class="settingshead1">Your ExpressTrade URL</h1>
            <input type="text" value="${data.url.res.short_url}" class="settingsurl" id="settingsurl" onclick="copyURL();" readonly></input>
            <h1 class="settingshead2">TwoFactor</h1>
            <h1 class="settingssubhead1">Use TwoFactor directly in our App by completing a few simple steps.</h1>
            <div class="settingsenable" id="settingsenable" onclick="showTwoFactorHelp();">Enable TwoFactor</div>
            <h1 class="settingshead3">User</h1>
            <div class="settingslogout" onclick="logoutUser();">Logout</div>
        </div>
    `
    }

    HTML += `
        <div class="settingswrapper">
            <h1 class="settingshead2">Favorites</h1>
            <h1 class="settingssubhead1">Manage your Favorite Trade Partners.</h1>
    `

    var favs = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    favs.forEach(element => {
            if (element.avatar != null && element.avatar.toString().indexOf("_full") == -1) {
                element.avatar = element.avatar.substring(0, element.avatar.length - 4) + "_full.jpg";
            }

            var c = data.users.map(function (e) { return e.uid; }).indexOf(element);

            if(c != -1) {
                HTML += `<div class="settingsfav">
                    <div class="settingsfavimg" style="background-image: url('${data.users[c].avatar}');"></div>
                    <h1 class="settingsfavname">${data.users[c].name}</h1>
                    <div class="settingsfavremove" onclick="removeFavourite(${data.users[c].uid})">
                        <img class="settingsfavremoveimg" src="img/button_decline.svg"></img>
                    </div>
                </div>`;
            } else {
                HTML += `<div class="settingsfav" unknown>
                    <div class="settingsfavimg" style="background-image: url('images/opskins-logo-avatar_full.jpg')"></div>
                    <h1 class="settingsfavname">Private User (ID: ${getUserCode(element + "")})</h1>
                    <div class="settingsfavremove" onclick="removeFavourite(${element})">
                        <img class="settingsfavremoveimg" src="img/button_decline.svg"></img>
                    </div>
                </div>`;
            }
    })

    HTML += `</div>`;

    HTML += `
        <div class="settingswrapper">
            <h1 class="settingshead2">Blacklist</h1>
            <h1 class="settingssubhead1">Incoming Trades from Blacklisted Users will automatically be declined by our Application.</h1>
    `

    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    bl.forEach(element => {
        if (element.avatar != null && element.avatar.toString().indexOf("_full") == -1) {
            element.avatar = element.avatar.substring(0, element.avatar.length - 4) + "_full.jpg";
        }

        var c = data.users.map(function (e) { return e.uid; }).indexOf(element);

        if (c != -1) {
            HTML += `<div class="settingsfav">
                    <div class="settingsfavimg" style="background-image: url('${data.users[c].avatar}');"></div>
                    <h1 class="settingsfavname">${data.users[c].name}</h1>
                    <div class="settingsfavremove" onclick="removeBlacklist(${data.users[c].uid})">
                        <img class="settingsfavremoveimg" src="img/button_decline.svg"></img>
                    </div>
                </div>`;
        } else {
            HTML += `<div class="settingsfav" unknown>
                    <div class="settingsfavimg" style="background-image: url('images/opskins-logo-avatar_full.jpg')"></div>
                    <h1 class="settingsfavname">Private User (ID: ${getUserCode(element + "")})</h1>
                    <div class="settingsfavremove" onclick="removeBlacklist(${element})">
                        <img class="settingsfavremoveimg" src="img/button_decline.svg"></img>
                    </div>
                </div>`;
        }
    })

    HTML += `</div>`;

    ele('appcontentinner').innerHTML = HTML;
    loadingEnded();
})

socket.on('show item', function (data) {
    if (ele('currentpagemeta').getAttribute('content') == "offer" || ele('currentpagemeta').getAttribute('content') == "inventory") {

        var e = data.res.items[0];
        var HTML = ``;

        if (ele('currentpagemeta').getAttribute('content') == "inventory") {

            if(e.internal_app_id != 1) {
                HTML += `
                    <div class="appitem ${e.rarity}">
                        <h1 class="appitemname">${e.name}</h1>
                        <i class="material-icons appitemclose" onclick="closeItemModal();">close</i>
                        <div class="appitemimage" style="background-image: url('${e.image["300px"]}'); background-size: contain;"></div>
                        <h1 class="appiteminfoleft2">Price: <b class="appiteminfobig">$${parseFloat(e.suggested_price / 100).toFixed(2)}</b></h1>
                        <h1 class="appiteminforight2">Item ID: <b class="appiteminfobig">${e.id}</b></h1>
                        <div class="appitemwithdraw" onclick="withdraw(${e.id}, 'reload');">Withdraw to OPSkins</div>
                        <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                        <div class="itembar"></div>
                    </div>
                `;
            } else {
                if(e.preview_urls["3d_viewer"] != null ) {
                    HTML += `
                    <div class="appitem ${e.rarity}">
                        <h1 class="appitemname">${e.name}</h1>
                        <i class="material-icons appitemclose" onclick="closeItemModal();">close</i>
                        <div class="appitemimage" style="background-image: url('${e.image["300px"]}');"></div>
                        <h1 class="appiteminfoleft1">Price: <b class="appiteminfobig">$${parseFloat(e.suggested_price / 100).toFixed(2)}</b></h1>
                        <h1 class="appiteminfoleft2">Wear: <b class="appiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b></h1>
                        <h1 class="appiteminfoleft3">Pattern Index: <b class="appiteminfobig">${e.pattern_index}</b></h1>
                        <h1 class="appiteminforight1">Serial Number: <b class="appiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                        <h1 class="appiteminforight2">Serial SKU: <b class="appiteminfobig">${e.attributes.serial_sku}</b></h1>
                        <h1 class="appiteminforight3">Item ID: <b class="appiteminfobig">${e.id}</b></h1>
                        <div class="appiteminspect" onclick="openBrowser('3d', '${e.preview_urls["3d_viewer"]}');">Inspect in 3D Viewer</div>
                        <div class="appitemwithdraw" onclick="withdraw(${e.id}, 'reload');">Withdraw to OPSkins</div>
                        <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                        <div class="itembar"></div>
                    </div>
                `;
                } else {
                    HTML += `
                        <div class="appitem ${e.rarity}">
                            <h1 class="appitemname">${e.name}</h1>
                            <i class="material-icons appitemclose" onclick="closeItemModal();">close</i>
                            <div class="appitemimage" style="background-image: url('${e.image["300px"]}');"></div>
                            <h1 class="appiteminfoleft1">Price: <b class="appiteminfobig">$${parseFloat(e.suggested_price / 100).toFixed(2)}</b></h1>
                            <h1 class="appiteminfoleft2">Wear: <b class="appiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b></h1>
                            <h1 class="appiteminfoleft3">Pattern Index: <b class="appiteminfobig">${e.pattern_index}</b></h1>
                            <h1 class="appiteminforight1">Serial Number: <b class="appiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                            <h1 class="appiteminforight2">Serial SKU: <b class="appiteminfobig">${e.attributes.serial_sku}</b></h1>
                            <h1 class="appiteminforight3">Item ID: <b class="appiteminfobig">${e.id}</b></h1>
                            <div class="appiteminspect" onclick="openBrowser('video', '${e.preview_urls["video"]}');">Inspect as Video</div>
                            <div class="appitemwithdraw" onclick="withdraw(${e.id}, 'reload');">Withdraw to OPSkins</div>
                            <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                            <div class="itembar"></div>
                        </div>
                    `;
                    }
                }
            } else {
                if (e.internal_app_id != 1) {
                    HTML += `
                    <div class="appitem ${e.rarity}">
                        <h1 class="appitemname">${e.name}</h1>
                        <i class="material-icons appitemclose" onclick="closeItemModal();">close</i>
                        <div class="appitemimage" style="background-image: url('${e.image["300px"]}'); background-size: contain;"></div>
                        <h1 class="appiteminfoleft2">Price: <b class="appiteminfobig">$${parseFloat(e.suggested_price / 100).toFixed(2)}</b></h1>
                        <h1 class="appiteminforight2">Item ID: <b class="appiteminfobig">${e.id}</b></h1>
                        <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                        <div class="itembar"></div>
                    </div>
                `;
                } else {
                    if (e.preview_urls["3d_viewer"] != null) {
                        HTML += `
                    <div class="appitem ${e.rarity}">
                        <h1 class="appitemname">${e.name}</h1>
                        <i class="material-icons appitemclose" onclick="closeItemModal();">close</i>
                        <div class="appitemimage" style="background-image: url('${e.image["300px"]}');"></div>
                        <h1 class="appiteminfoleft1">Price: <b class="appiteminfobig">$${parseFloat(e.suggested_price / 100).toFixed(2)}</b></h1>
                        <h1 class="appiteminfoleft2">Wear: <b class="appiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b></h1>
                        <h1 class="appiteminfoleft3">Pattern Index: <b class="appiteminfobig">${e.pattern_index}</b></h1>
                        <h1 class="appiteminforight1">Serial Number: <b class="appiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                        <h1 class="appiteminforight2">Serial SKU: <b class="appiteminfobig">${e.attributes.serial_sku}</b></h1>
                        <h1 class="appiteminforight3">Item ID: <b class="appiteminfobig">${e.id}</b></h1>
                        <div class="appiteminspect" onclick="openBrowser('3d', '${e.preview_urls["3d_viewer"]}');">Inspect in 3D Viewer</div>
                        <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                        <div class="itembar"></div>
                    </div>
                `;
                    } else {
                        HTML += `
                    <div class="appitem ${e.rarity}">
                        <h1 class="appitemname">${e.name}</h1>
                        <i class="material-icons appitemclose" onclick="closeItemModal();">close</i>
                        <div class="appitemimage" style="background-image: url('${e.image["300px"]}');"></div>
                        <h1 class="appiteminfoleft1">Price: <b class="appiteminfobig">$${parseFloat(e.suggested_price / 100).toFixed(2)}</b></h1>
                        <h1 class="appiteminfoleft2">Wear: <b class="appiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b></h1>
                        <h1 class="appiteminfoleft3">Pattern Index: <b class="appiteminfobig">${e.pattern_index}</b></h1>
                        <h1 class="appiteminforight1">Serial Number: <b class="appiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                        <h1 class="appiteminforight2">Serial SKU: <b class="appiteminfobig">${e.attributes.serial_sku}</b></h1>
                        <h1 class="appiteminforight3">Item ID: <b class="appiteminfobig">${e.id}</b></h1>
                        <div class="appiteminspect" onclick="openBrowser('video', '${e.preview_urls["video"]}');">Inspect as Video</div>
                        <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                        <div class="itembar"></div>
                    </div>
                `;
                }
            }
            
        }

        ele('appitemwrapper').innerHTML = HTML;
        ele('appitemwrapper').style.display = "flex";
    }
})

socket.on('accounts pending', function (data) {
    var nots = [];
    if(localStorage.getItem('notifications') != null) {
        nots = JSON.parse(localStorage.getItem('notifications'));
    }

    var list = JSON.parse(localStorage.getItem('logindata'));

    list.forEach((element, index) => {
        var c = data.map(function (e) { return e.acc; }).indexOf(element.user.id);
        if(c != -1) {
            nots[c] = data[index].total;
        }
    })

    localStorage.setItem("notifications", JSON.stringify(nots));

})

socket.on("withdraw", function (data) {
    if(data.status == 200) {
        showInventory();
    } else {
        showInventory();
    }
})




// NOTE: METHODS

function ele(id) {
    return document.getElementById(id);
}

function showItem(id) {
    socket.emit('show item', { key: acctoken, id: id });
}

function withdraw(id, type) {
    ele('appitemwrapper').style.display = "none";
    ele('appitemwrapper').innerHTML = "";
    loadingStart();
    socket.emit("withdraw", {key: acctoken, id: id});
}

function openBrowser(type, link) {
    if(type == "3d") {
        const browser = window.cordova.InAppBrowser.open(link, '_system');
    } else if(type == "video") {
        const browser = window.cordova.InAppBrowser.open(link, '_system');
    }
}

function closeItemModal() {
    ele('appitemwrapper').style.display = "none";
    ele('appitemwrapper').innerHTML = "";
}

function logoutUser() {

    var ld = JSON.parse(localStorage.getItem('logindata'));
    var nots = JSON.parse(localStorage.getItem('notifications'));

    socket.emit("logout token", ld[loggedin].token);

    ld.splice(loggedin, 1);
    nots.splice(loggedin, 1);

    if (ld.length == 0) {
        loggedin = "";
        ele('appcontentwrapper').style.display = "none";
        ele('apploadingcontent').style.display = "flex";
        ele('apploadingwrapper').style.display = "block";
        showLogin();
    } else {
        loggedin = ld.length - 1;
        changeLogin(loggedin);
    }

    localStorage.setItem("loggedin", loggedin);

    localStorage.setItem("logindata", JSON.stringify(ld));
    localStorage.setItem("notifications", JSON.stringify(nots));
    
}

function copyURL() {
    ele('settingsurl').select();
    document.execCommand('copy');
    document.getSelection().empty();
}

function enterTwoFactorSecret() {
    ele('apptfwrapper').style.display = "flex";
}

function proceedTwoFactorSecret() {
    var val = stripSpaces(ele('apptfinput').value);
    if (val != "") {
        ele('appoverlaycodebutton').style.display = "none";
        ele("appoverlaycodeuser").innerHTML = `OPSkins (Username)`;
        closeMenu();
        ele('tfoverlay').style.display = "none";
        ele('apptfwrapper').style.display = "none";
        twoFactorSet = true;

        totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromB32(val),
        });

        var ld = JSON.parse(localStorage.getItem('logindata'));

        ld[loggedin].twoFactor = { name: "Username", issuer: "OPSkins", secret: val };

        localStorage.setItem("logindata", JSON.stringify(ld));
        ele("apptfinput").value = "";
        showSettings();

    } else {

    }
}

function startTwoFactorFlow() {

    cordova.plugins.barcodeScanner.scan(
        function (result) {
            ele('tfoverlay').style.display = "none";
            proceedTwoFactorFlow(result.text);
        },
        function (error) {
            alert("Scanning failed: " + error);
        },
        {
            preferFrontCamera: false, // iOS and Android
            showFlipCameraButton: false, // iOS and Android
            showTorchButton: false, // iOS and Android
            torchOn: false, // Android, launch with the torch switched on (if available)
            saveHistory: false, // Android, save scan history (default false)
            prompt: "", // Android
            resultDisplayDuration: 0, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
            formats: "QR_CODE", // default: all but PDF_417 and RSS_EXPANDED
            orientation: "portrait", // Android only (portrait|landscape), default unset so it rotates with the device
            disableAnimations: true, // iOS
            disableSuccessBeep: true // iOS and Android
        }
    );
}

function showTwoFactorHelp() {
    ele('tfoverlay').style.display = "flex";
}

function disableTwoFactor() {

    ele('appoverlaycodetitle').innerHTML = "";  
    ele('appoverlaycodeuser').innerHTML = "";
    ele('appoverlaycodebutton').style.display = "flex";
    ele('appmodalinput').value = "";

    var ld = JSON.parse(localStorage.getItem('logindata'));

    ld[loggedin].twoFactor = null;

    localStorage.setItem("logindata", JSON.stringify(ld));

    token = "";
    twoFactorSet = false;
    totp = "";
    showSettings();
    ele('appoverlaybartop').removeAttribute("new");
}

function proceedTwoFactorFlow(url) {

    var t = new URL(url);

    var name = "";
    var sec = t.searchParams.get("secret");
    var issuer = t.searchParams.get("issuer");;

    var regex = /totp\/OPSkins%3A.+\?/gm;
    var str = url;
    var m;

    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        name = m[0].replace(/totp\/OPSkins%3A/, "").replace("?", "");
    }

    if (t.protocol == "otpauth:" && issuer == "OPSkins") {

        ele('appoverlaycodebutton').style.display = "none";
        ele("appoverlaycodeuser").innerHTML = `${issuer} (${name})`;
        twoFactorSet = true;

        totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromB32(stripSpaces(sec)),
        });

        var ld = JSON.parse(localStorage.getItem('logindata'));

        ld[loggedin].twoFactor = { name: name, issuer: issuer, secret: sec };

        localStorage.setItem("logindata", JSON.stringify(ld));
        showSettings();

    }
}

function selfSelect() {
    loadingStart();
    ele('appcontentleft').innerHTML = "check";
    ele('currentpagemeta').setAttribute('content', 'trade inv self');

    var sel = 0;

    var worthValue = 0.00;

    for (var i = 0; i < selfsel.length; i++) {
        if (selfsel[i] == true) {
            worthValue += selfinv[i].suggested_price / 100;
            sel++;
        }
    }

    switch (sel) {
        case 1:
            ele('appcontenttitle').innerHTML = `1 Skin - $${parseFloat(worthValue).toFixed(2)}`;
            break;

        default:
            ele('appcontenttitle').innerHTML = `${sel} Skins - $${parseFloat(worthValue).toFixed(2)}`;
            break;
    }

    enteredMessage = ele('trademessagetext').innerHTML;

    var HTML = ``;

    selfinv.forEach((e, index) => {
        if(selfsel[index] == true) {
            HTML += `
            <div class="invitem ${e.rarity}" id="invitem${index}" onclick="selectSkin(${index}, 'self')" active>
                <div class="invitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="invitemname">${e.name}</h1>
                <h1 class="inviteminfo">Wear: <b class="inviteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="inviteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="invitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                <div class="itembar"></div>
            </div>
        `;
        } else {
            HTML += `
            <div class="invitem ${e.rarity}" id="invitem${index}" onclick="selectSkin(${index}, 'self')">
                <div class="invitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="invitemname">${e.name}</h1>
                <h1 class="inviteminfo">Wear: <b class="inviteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="inviteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="invitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                <div class="itembar"></div>
            </div>
        `;
        }
    });

    ele('appcontentinner').innerHTML = HTML;
    setTimeout(() => {
        loadingEnded();
    }, 200)
}

function otherSelect() {
    loadingStart();
    ele('appcontentleft').innerHTML = "check";
    ele('currentpagemeta').setAttribute('content', 'trade inv other');

    var sel = 0;

    var worthValue = 0.00;

    for (var i = 0; i < othersel.length; i++) {
        if (othersel[i] == true) {
            worthValue += otherinv[i].suggested_price / 100;
            sel++;
        }
    }

    switch (sel) {
        case 1:
            ele('appcontenttitle').innerHTML = `1 Skin - $${parseFloat(worthValue).toFixed(2)}`;
            break;

        default:
            ele('appcontenttitle').innerHTML = `${sel} Skins - $${parseFloat(worthValue).toFixed(2)}`;
            break;
    }

    enteredMessage = ele('trademessagetext').innerHTML;

    var HTML = ``;

    otherinv.forEach((e, index) => {
        if (othersel[index] == true) {
            HTML += `
            <div class="invitem ${e.rarity}" id="invitem${index}" onclick="selectSkin(${index}, 'other')" active>
                <div class="invitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="invitemname">${e.name}</h1>
                <h1 class="inviteminfo">Wear: <b class="inviteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="inviteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="invitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                <div class="itembar"></div>
            </div>
        `;
        } else {
            HTML += `
            <div class="invitem ${e.rarity}" id="invitem${index}" onclick="selectSkin(${index}, 'other')">
                <div class="invitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="invitemname">${e.name}</h1>
                <h1 class="inviteminfo">Wear: <b class="inviteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="inviteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="invitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                <img src="img/wear_arrow.svg" class="itemarrow" style="left: calc(${e.wear * 100}% - 4.4px);"></img>
                <div class="itembar"></div>
            </div>
        `;
        }
    });

    ele('appcontentinner').innerHTML = HTML;
    setTimeout(() => {
        loadingEnded();
    }, 200)
}

function selectSkin(id, type) {
    if(type == "self") {
        if (selfsel[id] == true) {
            selfsel[id] = false;
            ele('invitem' + id).removeAttribute("active");
        } else if (selfsel[id] == false) {
            selfsel[id] = true;
            ele('invitem' + id).setAttribute("active", "");
        } else {

        }

        var sel = 0;

        var worthValue = 0.00;

        for (var i = 0; i < selfsel.length; i++) {
            if (selfsel[i] == true) {
                worthValue += selfinv[i].suggested_price / 100;
                sel++;
            }
        }

        switch (sel) {
            case 1:
                ele('appcontenttitle').innerHTML = `1 Skin - $${parseFloat(worthValue).toFixed(2)}`;
                break;
        
            default:
                ele('appcontenttitle').innerHTML = `${sel} Skins - $${parseFloat(worthValue).toFixed(2)}`;
                break;
        }
    } else if(type == "other") {
        if (othersel[id] == true) {
            othersel[id] = false;
            ele('invitem' + id).removeAttribute("active");
        } else if (othersel[id] == false) {
            othersel[id] = true;
            ele('invitem' + id).setAttribute("active", "");
        } else {

        }

        var sel = 0;

        var worthValue = 0.00;

        for (var i = 0; i < othersel.length; i++) {
            if (othersel[i] == true) {
                worthValue += otherinv[i].suggested_price / 100;
                sel++;
            }
        }

        switch (sel) {
            case 1:
                ele('appcontenttitle').innerHTML = `1 Skin - $${parseFloat(worthValue).toFixed(2)}`;
                break;

            default:
                ele('appcontenttitle').innerHTML = `${sel} Skins - $${parseFloat(worthValue).toFixed(2)}`;
                break;
        }
    }
}

function redrawTrade() {
    ele('currentpagemeta').setAttribute('content', 'trade detail');
    ele('appcontentleft').innerHTML = "arrow_back";
    ele('appcontentleft').setAttribute("onclick", "backKeyDown();");
    ele('appcontenttitle').innerHTML = "Trade";

    var HTML = ``;

    if (tradeuser.avatar != null && tradeuser.avatar.toString().indexOf("_full") == -1) {
        tradeuser.avatar = tradeuser.avatar.substring(0, tradeuser.avatar.length - 4) + "_full.jpg";
    }

    HTML += `<div class="trade" user creating>
                    <div class="tradecontent">
                        <div class="tradeavatar" style="background-image: url(${tradeuser.avatar});"></div>
                        <div class="tradestatus">
                            <img class="tradestatusimg" src="" alt="">
                        </div>
                        <img class="tradeauth" src="" alt="">
                        <h1 class="tradeuser">${tradeuser.username}</h1>
                        <div class="tradedecline" onclick="cancelTrade()">
                            <img class="tradedeclineimg" src="img/button_decline.svg" alt="">
                        </div>
                        <div class="tradeaccept" onclick="sendTrade('${tradeuserurl}')">
                            <img class="tradeacceptimg" src="img/button_accept.svg" alt="">
                        </div>
                        <h1 class="tradeinfo">You want to trade</h1>
                    </div>
                </div>`;

    var info1 = "";
    var info2 = "";

    var selfselcount = 0;

    var price1 = 0.00;

    var otherselcount = 0;

    var price2 = 0.00;

    for (var i = 0; i < selfsel.length; i++) {
        if (selfsel[i] == true) {
            price1 += selfinv[i].suggested_price / 100;
            selfselcount++;
        }
    }

    for (var j = 0; j < othersel.length; j++) {
        if (othersel[j] == true) {
            price2 += otherinv[j].suggested_price / 100;
            otherselcount++;
        }
    }

    switch (selfselcount) {
        case 1:
            info1 = `Your Items (${selfselcount} Skin)`;
            break;

        default:
            info1 = `Your Items (${selfselcount} Skins)`;
            break;
    }
    
    switch (otherselcount) {
        case 1:
            info2 = `Their Items (${otherselcount} Skin)`;
            break;

        default:
            info2 = `Their Items (${otherselcount} Skins)`;
            break;
    }

    HTML += `
        <div class="trademessage">
            <i class="material-icons trademessageicon">email</i>    
            <div class="trademessagetext" id="trademessagetext" contenteditable="true" style="min-width: 30px; text-overflow: unset !important;">${enteredMessage}</div>
        </div>
        <div class="tradeitems">
            <div class="tradeitemshead">
                <h1 class="tradeitemsheadleft">${info1}</h1>
                <h1 class="tradeitemsheadright">$${parseFloat(price1).toFixed(2)}</h1>
            </div>
    `;

    selfinv.forEach((e, index) => {
        if(selfsel[index] == true) {
            HTML += `   
            <div class="tradeitem ${e.rarity}" sent>
                <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                <h1 class="tradeitemname">${e.name}</h1>
                <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
            </div>
        `;
        }
    });

    HTML += `
            <div class="tradeplus" onclick="selfSelect();">
                <img class="tradeplusimg" src="img/button_plus.svg" alt="">
            </div>
            <div class="tradeitemshead" received >
                <h1 class="tradeitemsheadleft">$${parseFloat(price2).toFixed(2)}</h1>
                <h1 class="tradeitemsheadright">${info2}</h1>
            </div>
    `;

    otherinv.forEach((e, index) => {
        if(othersel[index] == true) {
            HTML += `   
                <div class="tradeitem ${e.rarity}" received>
                    <div class="tradeitemimage" style="background-image: url(${e.image["300px"]});"></div>
                    <h1 class="tradeitemname">${e.name}</h1>
                    <h1 class="tradeiteminfo">Wear: <b class="tradeiteminfobig">${parseFloat(e.wear * 100).toFixed(6)}%</b> - Serial Number: <b class="tradeiteminfobig">${e.attributes.serial_sku_wear}</b></h1>
                    <h1 class="tradeitemprice">$${parseFloat(e.suggested_price / 100).toFixed(2)}</h1>
                </div>
            `;
        }
    });

    HTML += `
            <div class="tradeplus" onclick="otherSelect();">
                <img class="tradeplusimg" src="img/button_plus.svg" alt="">
            </div>
        </div>
    `

    ele('appcontentinner').innerHTML = HTML;
}

function cancelTrade() {
    selfinv = [];
    otherinv = [];

    selfsel = [];
    othersel = [];

    tradeuser = {};
    tradeuserurl = "";
    enteredMessage = "";
    backKeyDown();
}

function openMenu() {

    menuOpen = true;

    ele('appcontentwrapper').style.opacity = ".25";
    ele('appoverlay').style.opacity = ".25";
    ele('appcontentmenuwrapper').style.transform = "translateX(100vw)";
}

function closeMenu() {

    menuOpen = false;
    accountsshowing = false;

    ele('appcontentwrapper').style.opacity = "1";
    ele('appcontentmenuaccounts').style.opacity = "0";
    ele('appcontentmenuaccounts').style.display = "none";
    ele('appoverlay').style.opacity = "1";
    ele('appcontentmenuexpand').removeAttribute('active');
    ele('appcontentmenuwrapper').style.transform = "translateX(0px)";
}

function loadingEnded() {
    ele('appcontentinner').style.opacity = 1;
    ele('appcontentloading').style.display = "none";
}

function loadingStart() {
    ele('appcontentinner').style.opacity = 0;
    ele('appcontentloading').style.display = "flex";
}

function menuCheck(id) {
    ele('appcontentinner').style.opacity = 0;
    ele('appcontentloading').style.display = "flex";

    var l = document.querySelectorAll('.men');

    l.forEach((element, index) => {
         element.removeAttribute('active');
         if(index <= 7) {
             element.style.display = "none";
         }
    })

    ele('menhead0').removeAttribute('open');
    ele('menhead1').removeAttribute('open');

    try {
        ele('men' + id).setAttribute('active', '');        
    } catch (e) {
        
    }

    if(id >= 0 && id <= 3) {
        ele('menhead0').setAttribute('open', '');
        ele('men0').style.display = "flex";
        ele('men1').style.display = "flex";
        ele('men2').style.display = "flex";
        ele('men3').style.display = "flex";
    } else if (id >= 4 && id <= 7) {
        ele('menhead1').setAttribute('open', '');
        ele('men4').style.display = "flex";
        ele('men5').style.display = "flex";
        ele('men6').style.display = "flex";
        ele('men7').style.display = "flex";
    }

}

function menuExpand(id) {
    if(id == 0) {
        if (ele('menhead0').getAttribute('open') == null) {
            ele('menhead0').setAttribute('open', '');
            ele('men0').style.display = "flex";
            ele('men1').style.display = "flex";
            ele('men2').style.display = "flex";
            ele('men3').style.display = "flex";
        } else {
            ele('menhead0').removeAttribute('open');
            ele('men0').style.display = "none";
            ele('men1').style.display = "none";
            ele('men2').style.display = "none";
            ele('men3').style.display = "none";
        }
    } else {
        if (ele('menhead1').getAttribute('open') == null) {
            ele('menhead1').setAttribute('open', '');
            ele('men4').style.display = "flex";
            ele('men5').style.display = "flex";
            ele('men6').style.display = "flex";
            ele('men7').style.display = "flex";
        } else {
            ele('menhead1').removeAttribute('open');
            ele('men4').style.display = "none";
            ele('men5').style.display = "none";
            ele('men6').style.display = "none";
            ele('men7').style.display = "none";
        }
    }
}

function swipeRight() {
    var cur = ele('currentpagemeta').getAttribute('content');

    if(cur != "offer" && cur != "login" && menuOpen == false) {
        openMenu();
    }
}

function swipeLeft() {
    var cur = ele('currentpagemeta').getAttribute('content');

    if (cur != "offer" && menuOpen == true) {
        closeMenu();
    }
}

function backKeyDown() {
    var cur = ele('currentpagemeta').getAttribute('content');
    if (cur != "trade inv self" && cur != "trade inv other") {
        loadingStart(); 
    }
    ele('appcontentright').innerHTML = "";
    ele('appcontentright').style.display = "none";

    switch (cur) {
        case "offers received pending":
            navigator.app.exitApp();            
            break;

        case "trade detail":
            showTrade();
            break;

        case "trade inv self":
            redrawTrade();
            break;

        case "trade inv other":
            redrawTrade();
            break;
    
        case "offer":
            var l = document.querySelectorAll('.men');
            var site = "";

            l.forEach(element => {
                if(element.getAttribute('active') != null) {
                    site = element.getAttribute('siteContext');
                }
            });

            switch (site) {
                case "offers received pending":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, 2, 0);
                    break;
                case "offers received accepted":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, 3, 0);

                    break;
                case "offers received declined":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, '5,6,7,8,10,12', 0);

                    break;
                case "offers received all":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, '2,3,4,5,6,7,8,10,12', 0);

                    break;
                case "offers sent pending":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, 2, 1);
                    break;
                case "offers sent accepted":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, 3, 1);

                    break;
                case "offers sent declined":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, '5,6,7,8,10,12', 1);

                    break;
                case "offers sent all":
                    ele('currentpagemeta').setAttribute('content', site);   
                    getOffers(0, '2,3,4,5,6,7,8,10,12', 1);

                    break;
                default:
                    ele('currentpagemeta').setAttribute('content', 'offers received pending');
                    getOffers(0, 2, 0);
                    break;
            }
            break;

        default:
            navigator.app.exitApp();
            break;
    }
}

function overscroll() {
    var running = false;
    if (ele('appcontentinner').scrollTop == 0 && running == false) {
        running = true;
        ele('appcontentinner').setAttribute("overscroll", "");
        setTimeout(() => {
            ele('appcontentinner').removeAttribute("overscroll");
            running = false;
        }, 400);
    }
}

function showLogin() {
    ele('appcontentwrapper').style.display = "none";
    ele('apploadingcontent').style.display = "flex";
    ele('apploadingwrapper').style.display = "block";
    ele('currentpagemeta').setAttribute('content', "login");
    ele('apploadingbar').setAttribute('disable', "");
    ele('apploadingimg').setAttribute('login', "");
    ele('apploadingbar').style.display = "none";
    ele('applogin').style.display = "block";
    setTimeout(() => {
        ele('apploadingbar').style.display = "none";
    }, 500);
}

function getCurrentSeconds() {
    return Math.round(new Date().getTime() / 1000.0);
}

function stripSpaces(str) {
    return str.replace(/\s/g, '');
}

function updatingIn() {
    return 30 - (getCurrentSeconds() % 30);
}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 15; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function checkToken(url) {
    var c;
    if(url.startsWith('waxexpress://token')) {
        c = getQueryVariable(url.replace("waxexpress://token", ""), "code");

        if(c.status == 200) {
            socket.emit('login token', c.res);
        }

    }
}

function showSettings() {
    ele('appcontentright').innerHTML = "";
    ele('appcontentright').style.display = "none";
    ele('currentpagemeta').setAttribute('content', 'settings');
    loadingStart();

    var list = [];

    JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites.forEach(element => {
        list.push(element);
    })

    JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist.forEach(element => {
        list.push(element);
    })

    socket.emit('settings open', { key: acctoken, users: list});
}

function showInventory() {
    ele('currentpagemeta').setAttribute('content', 'inventory');
    socket.emit('inventory show', { key: acctoken, sort: 6 });
}

function openOffer(id) {
    loadingStart();
    socket.emit('offer detail', { key: acctoken, id: id });
}

function openOfferRe(id) {
    loadingStart();
    socket.emit('offer detail re', { key: acctoken, id: id });
}

function acceptOffer(id, gift) {
    if(gift == true) {
        socket.emit('offer accept gift', { key: acctoken, id: id });
    } else {
        ele('appmodalaccept').setAttribute("onclick", "checkOffer(" + id + ");");
        ele('appmodalwrapper').style.display = "flex";
    }
}

function checkTrade(url) {

    var self = "";

    selfinv.forEach((element, index) => {
        if(selfsel[index] == true) {
            self += element.id + ",";
        }
    });

    var other = "";

    otherinv.forEach((element, index) => {
        if (othersel[index] == true) {
            other += element.id + ",";
        }
    });

    self = self.substring(0, self.length - 1);
    other = other.substring(0, other.length - 1);

    if (ele('trademessagetext').innerText != "Enter Message here...") {
        socket.emit('trade send', { key: acctoken, url: url, tf: ele('appmodalinput').value, itemsSend: self, itemsReceive: other, message: ele('trademessagetext').innerText });
    } else {
        socket.emit('trade send', { key: acctoken, url: url, tf: ele('appmodalinput').value, itemsSend: self, itemsReceive: other, message: "" });
    }

    ele('appmodalwrapper').style.display = "none";
    if(twoFactorSet == false) {
        ele('appmodalinput').value = "";
    }

    selfinv = [];
    otherinv = [];

    selfsel = [];
    othersel = [];

    tradeuser = {};
    tradeuserurl = "";
    enteredMessage = "";

}

function sendTrade(url) {
    ele('appmodalaccept').setAttribute("onclick", "checkTrade('" + url + "');");
    ele('appmodalwrapper').style.display = "flex";
}

function checkOffer(id) {
    socket.emit('offer accept', { key: acctoken, tf: ele('appmodalinput').value, id: id });
    if (twoFactorSet == false) {
        ele('appmodalinput').value = "";
    }
}

function declineOffer(id) {
    socket.emit('offer decline', { key: acctoken, id: id });
}

function declineOfferRe(id) {
    socket.emit('offer decline re', { key: acctoken, id: id });
}

function getOffers(sort, state, type) {

    var sorted = "";
    var typed = "";
    
    switch (sort) {
        case 0:
            sorted = "created";
            break;
        case 1:
            sorted = "expired";
            break;
        case 2:
            sorted = "modified";
            break;
        default:
            sorted = "created";
            break;
    }

    switch (type) {
        case 0:
            typed = "received";
            break;
        case 1:
            typed = "sent";
            break;
        default:
            typed = "received";
            break;
    }

    socket.emit('offers get', { key: acctoken, sort: sorted, state: state, type: typed });
}

function showTrade() {
    ele('currentpagemeta').setAttribute('content', 'trade');

    ele('appcontenttitle').innerHTML = "Trade";
    ele('appcontentleft').innerHTML = "dehaze";
    ele('appcontentleft').setAttribute("onclick", "openMenu();");

    ele('appcontentinner').innerHTML = `
        <div class="tradeurlwrapper">
            <div class="tradeurlbox">
                <h1 class="tradeurlheader">Enter WAX ExpressTrade URL:</h1>
                <input type="text" class="tradeurlinput" id="tradeurlinput"></input>
                <div class="tradeurlsubmit" onclick="submitURL();">
                    <i class="material-icons tradeurlsubmitcontent">arrow_forward</i>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        loadingEnded();
    }, 200)
}

function submitURL() {
    loadingStart();
    var url = ele('tradeurlinput').value;

    const regex = /\/\d+\//gm;
    const str = url;
    ele('tradeurlinput').value = "";
    let m;

    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        m.forEach((match, groupIndex) => {
            url = match;
        });
    }

    url = url.replace(/\//g, "");

    ele('appcontentinner').innerHTML = ``;

    if (isNaN(url) == false) {
        initializeTrade(url, str);
    }
}

function initializeTrade(uid, url) {
    socket.emit('trade init', { key: acctoken, uid: uid, url: url });
}

function getQueryVariable(url, variable) {
    
    var found = false;
    var query = url.substring(1);
    query = query.replace(/#$/gm, "");
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            found = true;
            return { status: 200, res: decodeURIComponent(pair[1]) };
        }
    }
    if(found == false) {
        return { status: 400, res: "Login failed" };
    }
}

function cordovaOauthLogin() {
    var p = makeid();

    const browser = window.cordova.InAppBrowser.open(
        'https://oauth.opskins.com/v1/authorize/?client_id=9ddfa402310f&state=' + p + '&duration=permanent&mobile=1&scope=identity+trades+items+manage_items&response_type=code',
        '_system',
        'location=no'
    )
    browser.addEventListener('loadstop', event => {

    })
}

function checkFavourite(uid, offer, type) {
    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    fav.push(uid);

    var ld = JSON.parse(localStorage.getItem('logindata'));

    ld[loggedin].favourites = fav;

    localStorage.setItem("logindata", JSON.stringify(ld));

    ele('appcontentright').innerHTML = "star";
    ele('appcontentright').setAttribute("onclick", "uncheckFavourite(" + uid + ")");

    if (type == "re") {
        socket.emit('offer detail re', { key: acctoken, id: offer });
    } else {
        socket.emit('offer detail', { key: acctoken, id: offer });
    }
}

function uncheckFavourite(uid, offer, type) {
    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    for(var i = 0; i < fav.length; i++) {
        if(fav[i] == uid) {
            fav.splice(i, 1);
        }
    }

    var ld = JSON.parse(localStorage.getItem('logindata'));

    ld[loggedin].favourites = fav;

    localStorage.setItem("logindata", JSON.stringify(ld));

    ele('appcontentright').innerHTML = "star_border";
    ele('appcontentright').setAttribute("onclick", "checkFavourite(" + uid + ")");

    if(type == "re") {
        socket.emit('offer detail re', { key: acctoken, id: offer });
    } else {
        socket.emit('offer detail', { key: acctoken, id: offer });
    }
}

function removeFavourite(uid) {
    var fav = JSON.parse(localStorage.getItem('logindata'))[loggedin].favourites;

    for (var i = 0; i < fav.length; i++) {
        if (fav[i] == uid) {
            fav.splice(i, 1);
        }
    }

    var ld = JSON.parse(localStorage.getItem('logindata'));

    ld[loggedin].favourites = fav;

    localStorage.setItem("logindata", JSON.stringify(ld));

    showSettings();
}

function removeBlacklist(uid) {
    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    for (var i = 0; i < bl.length; i++) {
        if (bl[i] == uid) {
            bl.splice(i, 1);
        }
    }

    var ld = JSON.parse(localStorage.getItem('logindata'));

    ld[loggedin].blacklist = bl;

    localStorage.setItem("logindata", JSON.stringify(ld));

    showSettings();
}

function checkBlacklist(uid) {
    var bl = JSON.parse(localStorage.getItem('logindata'))[loggedin].blacklist;

    var c = bl.map(function (e) { return e; }).indexOf(uid);

    if(c == -1) {

        bl.push(uid);

        var ld = JSON.parse(localStorage.getItem('logindata'));

        ld[loggedin].blacklist = bl;

        localStorage.setItem("logindata", JSON.stringify(ld));

        ele("tradeblacklist").style.display = "none";
        ele("tradeblacklistinfo").innerHTML = "This User is blacklisted! Visit the Settings to unblock this User.";
    }
}

function getUserCode(uid) {
    var alph = "BLHVZ62DNPKQXRGYE43S1CFU9T85A7";
    alph = alph.split("");

    var res = "";

    if(uid.startsWith("-")) {
        uid = uid.substring(1, uid.length);
        uid = uid.split("");

        uid.forEach(element => {
            res += alph[alph.length - 1 - parseInt(element)]
        })
    } else {
        uid = uid.split("");

        uid.forEach(element => {
            res += alph[parseInt(element)]
        })
    }

    return res;

}

function changeLogin(id) {
    loadingStart();
    localStorage.setItem("loggedin", id);
    loggedin = id;
    closeMenu();
    if (JSON.parse(localStorage.getItem('logindata'))[loggedin].token == null) {
        showLogin();
    } else {
        socket.emit('load token', JSON.parse(localStorage.getItem('logindata'))[loggedin].token);
    }
    if (JSON.parse(localStorage.getItem('logindata'))[loggedin].twoFactor != null) {
        ele('appoverlaycodebutton').style.display = "none";

        var tfItem = JSON.parse(localStorage.getItem('logindata'))[loggedin].twoFactor;

        ele("appoverlaycodeuser").innerHTML = `${tfItem.issuer} (${tfItem.name})`;

        token = null;

        totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromB32(stripSpaces(tfItem.secret)),
        });

        twoFactorSet = true;
    } else {
        twoFactorSet = false;
        ele('appoverlaycodetitle').innerHTML = "";
        ele('appoverlaycodeuser').innerHTML = "";
        ele('appoverlaycodebutton').style.display = "flex";
        ele('appmodalinput').value = "";
        ele('appoverlaybartop').removeAttribute("new");
    }
}

function showAccounts() {
    if(accountsshowing == true) {
        ele('appcontentmenuexpand').removeAttribute('active');
        accountsshowing = false;
        ele("appcontentmenuaccounts").innerHTML = "";
        ele("appcontentmenuaccounts").style.opacity = "0";
        ele("appcontentmenuaccounts").style.display = "none";
    } else {
        ele('appcontentmenuexpand').setAttribute('active', '');
        accountsshowing = true;
        var list = JSON.parse(localStorage.getItem('logindata'));
        var nots = JSON.parse(localStorage.getItem('notifications'));

        var HTML = ``;

        list.forEach((element, index) => {
            if(loggedin === index) {

            } else {
                if(nots[index] == 0) {
                    HTML += `
                    <div class="appcontentmenuaccountsentry" onclick="changeLogin(${index});">
                        <div class="appcontentmenuaccountsentrynots null"><h1 class="appcontentmenuaccountsentrynotsinner">${nots[index]}</h1></div>
                        <h1 class="appcontentmenuaccountsentryname">${element.user.display_name}</h1>
                        <div class="appcontentmenuaccountsentryimg" style="background-image: url('${element.user.avatar}')"></div>
                    </div>`
                } else if(nots[index] < 10) {
                    HTML += `
                    <div class="appcontentmenuaccountsentry" onclick="changeLogin(${index});">
                        <div class="appcontentmenuaccountsentrynots small"><h1 class="appcontentmenuaccountsentrynotsinner">${nots[index]}</h1></div>
                        <h1 class="appcontentmenuaccountsentryname">${element.user.display_name}</h1>
                        <div class="appcontentmenuaccountsentryimg" style="background-image: url('${element.user.avatar}')"></div>
                    </div>`
                } else if(nots[index] < 100) {
                    HTML += `
                    <div class="appcontentmenuaccountsentry" onclick="changeLogin(${index});">
                        <div class="appcontentmenuaccountsentrynots big"><h1 class="appcontentmenuaccountsentrynotsinner">${nots[index]}</h1></div>
                        <h1 class="appcontentmenuaccountsentryname">${element.user.display_name}</h1>
                        <div class="appcontentmenuaccountsentryimg" style="background-image: url('${element.user.avatar}')"></div>
                    </div>`
                } else {
                    HTML += `
                    <div class="appcontentmenuaccountsentry" onclick="changeLogin(${index});">
                        <div class="appcontentmenuaccountsentrynots xl"><h1 class="appcontentmenuaccountsentrynotsinner">99+</h1></div>
                        <h1 class="appcontentmenuaccountsentryname">${element.user.display_name}</h1>
                        <div class="appcontentmenuaccountsentryimg" style="background-image: url('${element.user.avatar}')"></div>
                    </div>`
                }
            }
            
        })

        ele("appcontentmenuaccounts").innerHTML = `${HTML}
            <div class="appcontentmenuaccountsentry" onclick="showLogin();">
                <h1 class="appcontentmenuaccountsentryname">Add Account</h1>
                <div class="appcontentmenuaccountsentryicon">
                    <i class="material-icons appcontentmenuaccountsentryiconinner">add</i>
                </div>
            </div>
        `;

        ele("appcontentmenuaccounts").style.opacity = "1";
        ele("appcontentmenuaccounts").style.display = "block";
    }
}

function getDate(timestamp) {
    timestamp = timestamp + "000";
    var today = new Date(parseInt(timestamp));
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }

    today = mm + '/' + dd + '/' + yyyy;
    return (today);
}

function getTime(timestamp) {
    timestamp = timestamp + "000";
    var tempdate = new Date(parseInt(timestamp));
    var h = tempdate.getHours();
    var m = tempdate.getMinutes();

    var d = "AM";

    if(h > 12) {
        h = h - 12;
        d = "PM";
    }
    if (m < 10) {
        m = '0' + m
    }


    return h + ":" + m + " " + d;
}




// NOTE: TIMERS

setInterval(() => {
    if(twoFactorSet == true) {
        if (token == null) {
            ele("appoverlaycodebutton").style.display = "none";
            token = totp.generate();
            ele('appoverlaycodetitle').innerHTML = token.substring(0, 3) + " " + token.substring(3, 6);
            ele('appmodalinput').value = token.substring(0, 3) + " " + token.substring(3, 6);
            ele('appoverlaycodetitle').removeAttribute("new");
            ele('appoverlaybartop').removeAttribute("new");
            setTimeout(() => {
                ele('appoverlaycodetitle').setAttribute("new", "");
                ele('appoverlaybartop').setAttribute("new", "");
            }, 100);
        } else if (token != totp.generate()) {
            token = totp.generate();
            ele('appoverlaycodetitle').innerHTML = token.substring(0, 3) + " " + token.substring(3, 6);
            ele('appmodalinput').value = token.substring(0, 3) + " " + token.substring(3, 6);
            ele('appoverlaycodetitle').removeAttribute("new");
            ele('appoverlaybartop').removeAttribute("new");
            setTimeout(() => {
                ele('appoverlaycodetitle').setAttribute("new", "");
                ele('appoverlaybartop').setAttribute("new", "");
            }, 100);
        }
    } else {

    }
}, 100)

setInterval(() => {
    var cur = ele('currentpagemeta').getAttribute('content');

    switch (cur) {
        case "offers received pending":
            socket.emit('offers get', { key: acctoken, sort: "created", state: 2, type: "received" });
            break;

        case "offer":
            break;

        default:
            break;
    }
}, 5000)

setInterval(() => {
    var cur = ele("currentpagemeta").getAttribute('content');

    if(cur != "login" && cur != "loading") {

        var list = JSON.parse(localStorage.getItem('logindata'));

        var data = [];

        list.forEach((element, index) => {
            if(loggedin === index) {
                data.push({ loggedin: true, token: acctoken, id: element.user.id });
            } else {
                data.push({ loggedin: false, token: element.token, id: element.user.id });
            }
        })

        socket.emit("accounts pending", data);
    }

}, 25000)

setInterval(() => {
    socket.emit("refresh token", reftoken);
}, 900000);
