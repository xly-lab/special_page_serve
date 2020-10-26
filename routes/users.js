const router = require('koa-router')()
const allServices = require('../mysql/index')
const { processID, createToken, randomUserName, sendCode, randomCode ,mkdirs} = require('../public/common/util')

const formidable = require('koa-formidable'); // 图片处理
const fs = require('fs'); // 图片路径
const path = require('path'); // 图片路径

const multer = require('koa-multer');//加载koa-multer模块

let _phone_code = 123;
let see_pass_p_code = 1234;
router.prefix('/users')

router.get('/', function (ctx, next) {
	ctx.body = 'this is a users response!'
})
router.get('/bar', function (ctx, next) {
	ctx.body = 'this is a users/bar response'
})
//登录
router.post('/login', async (ctx, next) => {
	console.log(ctx.request.body)
	const { username, password, phone_number, phone_code } = ctx.request.body
	let sql_word = `select count(*) as user_count from user_x where username = '${username}' ;`
	let result = await allServices.query(sql_word)
	if (!phone_number && username) {//账号密码登录
		if (result[0].user_count < 1) {
			return ctx.body = {
				code: 4002,
				msg: '登录失败，该账户不存在',
				login_status: 'fail'
			}
		} else if (result[0].user_count == 1) {
			let sql_word = `select count(*) as user_count from user_x where username = '${username}' and password = '${password}';`
			let result = await allServices.query(sql_word);
			if (result[0].user_count < 1) {
				return ctx.body = {
					code: 4001,
					msg: '登录失败，密码错误',
					login_status: 'fail'
				}
			} else {
				const Token = createToken({ username })
				let sql_word = `select * from user_x where username = '${username}' and password = '${password}';`
				let result = await allServices.query(sql_word);
				console.log(result[0])
				const { only_id, phone_number, avatar, register_time, user_type, register_type, password_type } = result[0]
				let _username = result[0].username
				return ctx.body = {
					code: 2000,
					msg: '登录成功',
					login_status: 'success',
					Token, only_id, username: _username, phone_number, avatar, register_time, user_type, register_type, password_type
				}
			}
		}
	} else {//手机号登录
		let sql_word_find = `select count(*) as user_count from user_x where phone_number = '${phone_number}' ;`
		let result = await allServices.query(sql_word_find)
		if (result[0].user_count !== 1) {
			return ctx.body = {
				code: 4009,
				msg: '登录失败，该手机号还未注册',
				login_status: 'fail'
			}
		} else {
			if (_phone_code != phone_code) {
				return ctx.body = {
					code: 4008,
					msg: '验证码错误',
					register_status: 'fail'
				}
			}
			let sql_centence = `SELECT username from user_x WHERE phone_number = '${phone_number}';`
			let result = await allServices.query(sql_centence)
			let sql_centence_1 = `select * from user_x where phone_number = '${phone_number}';`
			let result1 = await allServices.query(sql_centence_1)
			const { only_id, phone_number, avatar, register_time, user_type, register_type, password_type } = result1[0];
			let _username = result[0].username
			const Token = createToken({ username: result[0].username })
			return ctx.body = {
				code: 2004,
				msg: '手机登录成功',
				login_status: 'success',
				Token,
				only_id, username: _username, phone_number, avatar, register_time, user_type, register_type, password_type
			}
		}
	}

})
//注册
router.post('/register', async (ctx, next) => {
	console.log(ctx.request.body)
	const { username, password, phone_number, phone_code } = ctx.request.body
	if (!phone_number && username) {//用户密码注册
		let register_time = Date.now(), only_id = processID();
		let sql_word_find = `select count(*) as user_count from user_x where username = '${username}' ;`
		let result = await allServices.query(sql_word_find)
		if (result[0].user_count == 1) {
			return ctx.body = {
				code: 4004,
				msg: '注册失败，该用户名已存在',
				login_status: 'fail'
			}
		} else {
			let sql_word = `INSERT into user_x (only_id,username,password,user_type,register_time,register_type,password_type) 
        VALUES('${only_id}','${username}','${password}','${1}','${register_time}','UP','Y');`;
			let result = await allServices.query(sql_word);
			console.log(result)
			return ctx.body = {
				code: 2001,
				msg: '注册成功',
				login_status: 'success'
			}
		}
	} else {//手机注册
		let sql_word_find = `select count(*) as user_count from user_x where phone_number = '${phone_number}' ;`
		let result = await allServices.query(sql_word_find)
		if (result[0].user_count == 1) {
			return ctx.body = {
				code: 4005,
				msg: '注册失败，该手机号已注册',
				login_status: 'fail'
			}
		} else {
			if (_phone_code != phone_code) {
				return ctx.body = {
					code: 4006,
					msg: '验证码错误',
					register_status: 'fail'
				}
			}
			let register_time = Date.now(), only_id = processID();
			let _randomUserName = randomUserName()//生成随机用户名
			let _password = randomUserName(12)//生成12位密码
			let sql_word = `INSERT into user_x (only_id,username,password,user_type,register_time,register_type,password_type,phone_number) VALUES('${only_id}','${_randomUserName}','${_password}','${1}','${register_time}','P','N','${phone_number}');`;
			let result = await allServices.query(sql_word);
			console.log(result)
			return ctx.body = {
				code: 2003,
				msg: '注册成功',
				login_status: 'success',
				register_time, username: _randomUserName, phone_number, only_id, user_type: 1, password_type: 'N', register_type: 'P',
			}
		}
	}
})
//手机接收验证码
router.post('/get_phone_code', async (ctx, next) => {
	const { phone_number, see } = ctx.request.body
	_phone_code = randomCode(6);
	see_pass_p_code = randomCode(6);
	if (see == 'y') {
		await sendCode(phone_number, see_pass_p_code).then(res => {
			if (res.status) {
				let tiemr = setTimeout(() => {
					_phone_code = null
					clearTimeout(tiemr)
				}, 5 * 60 * 1000)
				return ctx.body = {
					code: 2002,
					msg: '验证码发送成功',
					login_status: 'success'
				}
			}
		}).catch(err => {
			if (!err.status) {
				return ctx.body = {
					code: 4005,
					msg: err.statusMsg,
					login_status: 'fail'
				}
			}
		});
	} else {
		await sendCode(phone_number, _phone_code).then(res => {
			if (res.status) {
				let tiemr = setTimeout(() => {
					_phone_code = null
					clearTimeout(tiemr)
				}, 5 * 60 * 1000)
				return ctx.body = {
					code: 2002,
					msg: '验证码发送成功',
					login_status: 'success'
				}
			}
		}).catch(err => {
			if (!err.status) {
				return ctx.body = {
					code: 4005,
					msg: err.statusMsg,
					login_status: 'fail'
				}
			}
		});
	}
})
//修改密码
router.post('/change_password', async (ctx, next) => {
	const { username, password, phone_number, phone_code } = ctx.request.body;
	let sql_find1 = `select count(*) as user_count from user_x where phone_number = '${phone_number}' ;`
	let sql_find2 = `select count(*) as user_count from user_x where username = '${username}' ;`
	let result1 = await allServices.query(sql_find1);
	let result2 = await allServices.query(sql_find2);
	if (result2[0].user_count !== 1) {
		return ctx.body = {
			code: 4011,
			msg: '该账户不存在',
			change_status: 'fail'
		}
	}
	if (result1[0].user_count !== 1) {
		return ctx.body = {
			code: 4010,
			msg: '该手机号还没有注册',
			change_status: 'fail'
		}
	}
	if (phone_code != _phone_code) {
		return ctx.body = {
			code: 4012,
			msg: '输入验证码错误',
			change_status: 'fail'
		}
	}
	let sql_find3 = `select username from user_x where phone_number = '${phone_number}';`;
	let result3 = await allServices.query(sql_find3);
	console.log(result3)
	if (result3[0].username != username) {
		return ctx.body = {
			code: 4013,
			msg: '该手机没有与该账户绑定',
			change_status: 'fail'
		}
	}
	let sql_update = `update user_x set password = '${password}',password_type = 'Y' where username = '${username}' and phone_number = '${phone_number}';`
	let updateResult = await allServices.query(sql_update);
	console.log(updateResult);
	if (updateResult.affectedRows == 1) {
		return ctx.body = {
			code: 2006,
			msg: '密码修改成功',
			change_status: 'success'
		}
	} else {
		return ctx.body = {
			code: 2006,
			msg: '密码与原密码一致',
			change_status: 'success'
		}
	}
})
//验证用户登录并获取用户信息
router.get('/verify_userInfo', async (ctx, next) => {
	console.log(ctx.query)
	const { only_id } = ctx.query
	if (only_id == 'null') {
		return ctx.body = {
			code: 4041,
			msg: '未接收到only_id',
			verify_status: false
		}
	}
	let sql = `select * from user_x where only_id = '${only_id}';`
	let result = await allServices.query(sql);
	console.log('result', result)
	if (result.length == 0) {
		return ctx.body = {
			code: 4042,
			msg: '未查询到该用户',
			verify_status: false
		}
	}
	const { username, phone_number, avatar, register_time, user_type, register_type, password_type,nickName ,mail,gender,describe_txt} = result[0];
	let _only_id = result[0].only_id
	return ctx.body = {
		code: 2005,
		msg: 'token可用',
		verify_status: true,
		username, phone_number, avatar, register_time, user_type, register_type, password_type, only_id: _only_id,nickName ,mail,gender,describe_txt
	}
})

//获取密码
router.get('/get_password', async (ctx, next) => {
	const { phone_number, see_p_code } = ctx.query;
	if (see_pass_p_code != see_p_code) {
		return ctx.body = {
			code: 4006,
			msg: '验证码错误',
			getPass_status: 'fail'
		}
	}
	let sql_word_find = `select password from user_x where phone_number = '${phone_number}' ;`
	let result = await allServices.query(sql_word_find)
	console.log(result)
	return ctx.body = {
		code: 2007,
		password: result[0].password,
		getPass_status: 'success'
	}
})

//修改个人信息
router.post('/change_userInfo',async (ctx, next) => {
	const { nickName, mail, gender, describe_txt, only_id } = ctx.request.body
	let sql = `update user_x set nickName = '${nickName}',mail='${mail}',gender = '${gender}',describe_txt = '${describe_txt}' where only_id = '${only_id}';`
	let result = await allServices.query(sql);
	console.log(result)
	if(result.affectedRows == 1){
		return ctx.body = {
			code:2008,
			changeInfo_status:'success',
			msg:'修改信息成功'
		}
	}
})

//配置
const storage = multer.diskStorage({
	//文件保存路径
	destination: function (req, file, cb) {
		cb(null, 'public/images/userAvatar/')
	},
	//修改文件名称
	filename: function (req, file, cb) {
		console.log('file.originalname',file.originalname)
		var fileFormat = (file.originalname).split(".");
		cb(null,`${fileFormat[0]}_${Date.now()}.${(fileFormat[fileFormat.length - 1]).toLowerCase()}`)
	}
});

  //加载配置
const upload = multer({ storage: storage });
  //获取图片
router.post('/photos',upload.single('file'),async ctx=>{
	const {only_id} = ctx.request.header 
	let sql = `update user_x set avatar = '${ctx.req.file.filename}' where only_id = '${only_id}'`
	let result = await allServices.query(sql);
	console.log(result);
	if(result.affectedRows==1){
		ctx.body={
			code:2010,
			photo_status:'success',
			filename: ctx.req.file.filename,//返回文件名
			msg:'头像上传成功'
		}
	}else{
		ctx.body={
			code:4011,
			photo_status:'fail',
			filename: ctx.req.file.filename,//返回文件名
			msg:'头像上传失败'
		}
	}
});

module.exports = router
