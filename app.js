const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const cors = require('koa-cors')
const index = require('./routes/index')
const users = require('./routes/users')
const {verifyToken} = require('./public/common/util')
// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(cors({
  origin: '*',
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 5,
  credentials: true,
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  let url = ctx.url.split('?')
  console.log(url)
  if(!['/users/login','/users/register','/users/get_phone_code','/users/change_password'].includes(url[0])){
    if(url[0].search('/public/images/userAvatar/')!=-1){
      await next()
      ms = new Date() - start
    }
    let token = ctx.request.header.authorization;
    let verifyData = await verifyToken(token)
    let ms;
    if(verifyData){
      await next()
      ms = new Date() - start
    }else if(!verifyData&&token==undefined){
      ctx.body = {
        code:4040,
        msg:'当前token不存在，存在不可控访问',
        verify_status:'fail'
      }
      ms = new Date() - start
    }else{
      ctx.body = {
        code:4040,
        msg:'当前token已失效，请重新登录',
        verify_status:'fail'
      }
      ms = new Date() - start
    }
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
  }else{
    await next()
    ms = new Date() - start
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
  }
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
