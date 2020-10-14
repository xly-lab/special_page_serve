const router = require('koa-router')()
const allServices = require('../mysql/index')
const {processID,createToken,randomUserName,sendCode,randomCode} = require('../public/common/util')

let _phone_code;
router.prefix('/users')

router.get('/', function (ctx, next) {
  ctx.body = 'this is a users response!'
})

router.get('/bar', function (ctx, next) {
  ctx.body = 'this is a users/bar response'
})
//登录
router.post('/login',async(ctx,next)=>{
  console.log(ctx.request.body)
  const {username,password,phone_number,phone_code} = ctx.request.body
  let sql_word = `select count(*) as user_count from user_x where username = '${username}' ;`
  let result = await allServices.query(sql_word)
  if(!phone_number&&username){//账号密码登录
    if(result[0].user_count<1){
      return ctx.body = {
        code:4002,
        msg:'登录失败，该账户不存在',
        login_status:'fail'
      }
    }else if(result[0].user_count == 1){
      let sql_word = `select count(*) as user_count from user_x where username = '${username}' and password = '${password}';`
      let result = await allServices.query(sql_word);
      if(result[0].user_count<1){
        return ctx.body = {
          code:4001,
          msg:'登录失败，密码错误',
          login_status:'fail'
        }
      }else{
        const Token = createToken({username})
        return ctx.body = {
          code:2000,
          msg:'登录成功',
          login_status:'success',
          Token
        }
      }
    }
  }else{//手机号登录
    let sql_word_find = `select count(*) as user_count from user_x where phone_number = '${phone_number}' ;`
    let result = await allServices.query(sql_word_find)
    if(result[0].user_count !== 1){
      return ctx.body = {
        code:4009,
        msg:'登录失败，该手机号还未注册',
        login_status:'fail'
      }
    }else{
      if(_phone_code!=phone_code){
        return ctx.body = {
          code:4008,
          msg:'验证码错误',
          register_status:'fail'
        }
      }
      let sql_centence = "SELECT username from user_x WHERE phone_number = '18380127515'"
      let result = await allServices.query(sql_centence)
      const Token = createToken({username:result[0].username})
      return ctx.body = {
        code:2004,
        msg:'手机登录成功',
        login_status:'success',
        Token
      }
    }
  }
  
})
//注册
router.post('/register',async (ctx,next)=>{
  console.log(ctx.request.body)
  const {username,password,phone_number,phone_code} = ctx.request.body
  console.log(phone_number)
  if(!phone_number&&username){//用户密码注册
    let register_time = Date.now(),only_id=processID();
    let sql_word_find = `select count(*) as user_count from user_x where username = '${username}' ;`
    let result = await allServices.query(sql_word_find)
    if(result[0].user_count == 1){
      return ctx.body = {
        code:4004,
        msg:'注册失败，该用户名已存在',
        login_status:'fail'
      }
    }else{
      let sql_word = `INSERT into user_x (only_id,username,password,user_type,register_time,register_type,password_type) 
        VALUES('${only_id}','${username}','${password}','${1}','${register_time}','UP','Y');`;
      let result = await allServices.query(sql_word);
      console.log(result)
      return ctx.body = {
        code:2001,
        msg:'注册成功',
        login_status:'success'
      }
    }
  }else{//手机注册
    let sql_word_find = `select count(*) as user_count from user_x where phone_number = '${phone_number}' ;`
    let result = await allServices.query(sql_word_find)
    if(result[0].user_count == 1){
      return ctx.body = {
        code:4005,
        msg:'注册失败，该手机号已注册',
        login_status:'fail'
      }
    }else{
      if(_phone_code!=phone_code){
        return ctx.body = {
          code:4006,
          msg:'验证码错误',
          register_status:'fail'
        }
      }
      let register_time = Date.now(),only_id=processID();
      let _randomUserName = randomUserName()//生成随机用户名
      let _password = randomUserName(12)//生成12位密码
      let sql_word = `INSERT into user_x (only_id,username,password,user_type,register_time,register_type,password_type,phone_number) VALUES('${only_id}','${_randomUserName}','${_password}','${1}','${register_time}','P','N','${phone_number}');`;
      let result = await allServices.query(sql_word);
      console.log(result)
      return ctx.body = {
        code:2003,
        msg:'注册成功',
        login_status:'success'
      }
    }
  }
})
//手机接收验证码
router.post('/get_phone_code',async(ctx,next)=>{
  const {phone_number} = ctx.request.body
  _phone_code = randomCode(6);
  await sendCode(phone_number,_phone_code).then(res=>{
    if(res.status){
      let tiemr = setTimeout(()=>{
        _phone_code= null
        clearTimeout(tiemr)
      },5*60*1000)
      return ctx.body = {
        code:2002,
        msg:'验证码发送成功',
        login_status:'success'
      }
    }
  }).catch(err=>{
    if(!err.status){
      return ctx.body = {
        code:4005,
        msg:err.statusMsg,
        login_status:'fail'
      }
    }
  });
})
//修改密码
router.post('/change_password',async (ctx ,next) => {
  const {username,password,phone_number,phone_code} = ctx.request.body;
  let sql_find1 = `select count(*) as user_count from user_x where phone_number = '${phone_number}' ;`
  let sql_find2= `select count(*) as user_count from user_x where username = '${username}' ;`
  let result1 = await allServices.query(sql_find1);
  let result2 = await allServices.query(sql_find2);
  if(result2[0].user_count!==1){
    return ctx.body = {
      code:4011,
      msg:'该账户不存在',
      change_status:'fail'
    }
  }
  if(result1[0].user_count!==1){
    return ctx.body = {
      code:4010,
      msg:'该手机号还没有注册',
      change_status:'fail'
    }
  }
  if(phone_code!=_phone_code){
    return ctx.body = {
        code:4012,
        msg:'输入验证码错误',
        change_status:'fail'
    }
  }
  let sql_find3 = `select username from user_x where phone_number = '${phone_number}';`;
  let result3 = await allServices.query(sql_find3);
  console.log(result3)
  if(result3[0].username != username){
    return ctx.body = {
      code:4013,
      msg:'该手机没有与该账户绑定',
      change_status:'fail'
    }
  }
  let sql_update = `update user_x set password = '${password}' where username = '${username}' and phone_number = '${phone_number}';`
  let updateResult = allServices.query(sql_update);
  console.log(updateResult);
})


module.exports = router
