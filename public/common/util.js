var jwt = require('jsonwebtoken');
var md5 = require('blueimp-md5')
var moment = require('moment')
var Base64 = require('js-base64').Base64;
var request = require('request');
const fs = require('fs'); // 图片路径
const path = require('path'); // 图片路径

const processID = () => {
    const uuid = 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return uuid;
}

const SECRET = 'test'  //设置秘钥，加密秘钥和解密秘钥必须是同一个，最好设置为全局变量，方便修改
// 生成token
function createToken(user) {
    let username = user.username
    let token = jwt.sign({
        username
    }, SECRET, {
        // 过期时间7天
        'expiresIn': 60 * 60 * 24 * 7//60 * 60 * 24 * 7
    })
    return token
}

// 验证token
function verifyToken(token) {
    let promise = new Promise((resolve, reject) => {
        if (!token) {
            resolve(false)
        }
        jwt.verify(token, SECRET, (error, result) => {
            if (error&&error.name=='TokenExpiredError') {
                resolve(false)
            } else {
                resolve(true)
            }
        })
    })
    return promise
}
/*
 生成指定长度的随机数
 */
function randomCode(length) {
    var chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var result = ""; //统一改名: alt + shift + R
    for (var i = 0; i < length; i++) {
        var index = Math.ceil(Math.random() * 9);
        result += chars[index];
    }
    return result;
}
//随机生成用户名
function randomUserName(len) {
    len = len || 8;
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    var maxPos = $chars.length;
    var pwd = '';
    for (i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}
/*
向指定号码发送指定验证码
 */
function sendCode(phone, code) {
    return new Promise((resolve, reject)=>{
        var ACCOUNT_SID = '8a216da86904c060016909c25469023f';
        var AUTH_TOKEN = '9a9d35a1c6d64417b8c09d4294dc7d56';
        var Rest_URL = 'https://app.cloopen.com:8883';
        var AppID = '8a216da86904c060016909c254c80246';
    
        // var ACCOUNT_SID = '8a216da8707fdf1e0170b3c4507603d6';
        // var AUTH_TOKEN = '659466f0cfb54232b0e067df9e993c68';
        // var Rest_URL = 'https://app.cloopen.com:8883';
        // var AppID = '8a216da8707fdf1e0170b3c450f703dd6';
        //1. 准备请求url
        /*
         1.使用MD5加密（账户Id + 账户授权令牌 + 时间戳）。其中账户Id和账户授权令牌根据url的验证级别对应主账户。
         时间戳是当前系统时间，格式"yyyyMMddHHmmss"。时间戳有效时间为24小时，如：20140416142030
         2.SigParameter参数需要大写，如不能写成sig=abcdefg而应该写成sig=ABCDEFG
         */
        var sigParameter = '';
        var time = moment().format('YYYYMMDDHHmmss');
        sigParameter = md5(ACCOUNT_SID + AUTH_TOKEN + time);
        var url = Rest_URL + '/2013-12-26/Accounts/' + ACCOUNT_SID + '/SMS/TemplateSMS?sig=' + sigParameter;
    
        //2. 准备请求体
        var body = {
            to: phone,
            appId: AppID,
            templateId: '1',
            "datas": [code, "1"]
        }
        //body = JSON.stringify(body);
    
        //3. 准备请求头
        /*
         1.使用Base64编码（账户Id + 冒号 + 时间戳）其中账户Id根据url的验证级别对应主账户
         2.冒号为英文冒号
         3.时间戳是当前系统时间，格式"yyyyMMddHHmmss"，需与SigParameter中时间戳相同。
         */
        var authorization = ACCOUNT_SID + ':' + time;
        authorization = Base64.encode(authorization);
        var headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json;charset=utf-8',
            'Content-Length': JSON.stringify(body).length + '',
            'Authorization': authorization
        }
    
        //4. 发送请求, 并得到返回的结果, 调用callback
        // callback(true);
        request({
            method: 'POST',
            url: url,
            headers: headers,
            body: body,
            json: true
        }, function (error, response, body) {
            // console.log(error, response, body);
            if(body.statusCode === '000000'){
                resolve({status:true});
            }else{
                console.log('===========',body)
                reject({status:false,statusMsg:body.statusMsg});
            }
            // callback(true);
        });
    })
}

// 新建文件，可以去百度fs模块
const mkdirs = (dirname, callback)=> {
    fs.stat(dirname, function(exists) {
        if (exists) {
            callback();
        } else {
            mkdirs(path.dirname(dirname), function() {
                fs.mkdir(dirname, callback);
            });
        }
    });
};

module.exports = { processID, createToken, verifyToken, randomUserName,sendCode,randomCode,mkdirs }
