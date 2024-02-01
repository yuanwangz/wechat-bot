import WebSocket from 'ws'
import rp from 'request-promise'
import chatgptReply from "./utils/chatgpt.js"
import getFile from "./utils/dattofile.js"
import sparkReply from "./utils/sparkmsg.js"
import { containsTextFileLine } from "./utils/checkword.js"
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import fetch from 'node-fetch';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import express from 'express';
import sharp from 'sharp';
import crypto from 'crypto';
import { parseString } from 'xml2js';
dotenv.config()
import {
    get_personal_info,
    getid,
    get_chat_nick_p,
    get_chat_nick,
    handle_nick,
    handle_memberlist,
    get_chatroom_memberlist,
    send_attatch,
    send_at_msg,
    send_pic_msg,
	send_file_msg,
    get_personal_detail,
    send_txt_msg,
    get_contact_list,
    handle_wxuser_list,
    handle_recv_msg,
    heartbeat,
    debug_switch,
    get_member_nick
} from "./server/client.js"

// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');
const app = express();
const SERVER_HOST = process.env.SERVER_HOST
const BACKEND_URL = process.env.BACKEND_URL
let BOT_NICKNAME = ''
let BOT_WXID =''
const ws = new WebSocket(`ws://${SERVER_HOST}`);
const url = `http://${SERVER_HOST}`;
const HEART_BEAT = 5005;
const RECV_TXT_MSG = 1;
const RECV_PIC_MSG = 3;
const USER_LIST = 5000;
const GET_USER_LIST_SUCCSESS = 5001;
const GET_USER_LIST_FAIL = 5002;
const TXT_MSG = 555;
const PIC_MSG = 500;
const AT_MSG = 550;
const YY_MSG = 49; //引用消息
const CHATROOM_MEMBER = 5010;
const CHATROOM_MEMBER_NICK = 5020;
const PERSONAL_INFO = 6500;
const DEBUG_SWITCH = 6000;
const PERSONAL_DETAIL = 6550;
const DESTROY_ALL = 9999;
const NEW_FRIEND_REQUEST = 37;//微信好友请求消息
const AGREE_TO_FRIEND_REQUEST = 10000;//同意微信好友请求消息
const ATTATCH_FILE = 5003;

async function downloadImage(url, targetPath) {
    try {
        // 检查目录是否存在
        const dir = path.dirname(targetPath);
        try {
            await fsp.access(dir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 如果目录不存在，创建它
                await fsp.mkdir(dir, { recursive: true });
            } else {
                throw error; // 重新抛出其他错误
            }
        }

        // 下载图片
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let md5Hash;
        if (response.headers.get('content-type').includes('image/webp')) {
            // 处理WebP图片的下载逻辑
            const image = sharp(buffer).jpeg();
            await image.toFile(targetPath);
            md5Hash = crypto.createHash('md5').update(await fsp.readFile(targetPath)).digest('hex');
        } else {
            // 处理其他图片类型的下载逻辑
            await fsp.writeFile(targetPath, buffer);
            md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        }
		// const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        // await fsp.writeFile(targetPath, buffer);
        console.log('Image successfully downloaded and saved to', targetPath+",md5:"+md5Hash);
		return md5Hash;
    } catch (error) {
        console.error('Error occurred in downloadImage:', error);
        throw error;
    }
}

function replaceLongUrlsWithDomain(inputString) {
    const citationUrlRegex = /\[\[(\d+)\]\((https?:\/\/[^\s()<>]+(?:\([\w.]+\))?[^\s()<>]*)\)\]/g;
    return inputString.replace(citationUrlRegex, (fullMatch, number, url) => {
        // 提取网址的协议和主域名
        const domainMatch = url.length > 80 ? url.match(/^(https?:\/\/[^\/]+)/) : null;

        // 如果网址长度大于 80 个字符，则替换为主域名，否则保持原始链接
        const shortenedUrl = domainMatch ? domainMatch[1] : url;

        return `[ 来源：${shortenedUrl} ]`;
    });
}

function parseXml(xml) {
  return new Promise((resolve, reject) => {
    parseString(xml, {explicitArray: false}, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function getFirstFilePath(directory) {
    try {
        // 同步读取目录内容
        const files = fs.readdirSync(directory);

        // 过滤掉目录，只保留文件
        const firstFile = files.find(file => {
            return fs.statSync(path.join(directory, file)).isFile();
        });

        // 如果找到了文件，返回其完整路径
        if (firstFile) {
            return path.join(directory, firstFile);
        } else {
            throw new Error('No files found in the directory');
        }
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}


ws.on('open', async function open() {
    ws.send(get_personal_info());
    //通讯录
    // ws.send( get_contact_list());
    // const j = await get_personal_info1();
    // console.log(j);
    // ws.send(await get_personal_info1());

});

async function processMessage(msg, roomid) {
    // 移除包含特定关键词的Markdown代码块
    let cleanedMsg = msg.replace(/```[\s\S]*?(prompt|search\(|mclick\()[\s\S]*?```/g, '');

    const resultMarkdownRegex = /^```[\s\S]*?Result:[\s\S]*?```[\s\S]*?```/gm;
    cleanedMsg = cleanedMsg.replace(resultMarkdownRegex, '');

    // 提取图片链接
    let imageRegex = /\[下载[^\]]*\]\((.*?)\)/g;
    let matches = [...cleanedMsg.matchAll(imageRegex)];
    if (matches.length == 0){
    	imageRegex = /!\[[^\]]*\]\((.*?)\)/g;
    	matches = [...cleanedMsg.matchAll(imageRegex)];
    }
    if (matches.length > 0) {
        let imageUrl = matches[0][1]; // 取第一个匹配项的URL
        const match = imageUrl.match(/\$\{(.+?)\}/);
        imageUrl = match ? match[1] : imageUrl;
        console.log(imageUrl);

        // 图片下载和处理的代码
        let filename = imageUrl.split('/').pop();
		const queryIndex = filename.indexOf('?');
		if (queryIndex !== -1) {
		  // 如果包含参数部分，则截取文件名部分
		  filename = filename.substring(0, queryIndex);
		}
        // 定义一个图片类型的扩展名数组
        const imageExtensions = ['png', 'jpeg', 'gif', 'bmp', 'tiff','jpg','webp'];
        const fileExtension = filename.split('.').pop().toLowerCase();

        if (imageExtensions.includes(fileExtension)) {
			filename = filename.replace(/[^\u4e00-\u9fa5\w\d.]/g, '');
            filename = filename.replace(/\.[^/.]+$/, '.jpg');
        }

        const imagePath = path.resolve('upload', filename);

        try {
            const md5 = await downloadImage(imageUrl, imagePath);
			if (imageExtensions.includes(fileExtension)) {
			    ws.send(send_pic_msg(roomid, filename));
			}else {
				ws.send(send_file_msg(roomid, filename));
			}
			const saveFileDir = path.join(path.resolve('./WeChat Files/file'), md5, filename);
			let file_dir = path.dirname(saveFileDir);
			if (!fs.existsSync(file_dir)) {
			    // 如果目标目录不存在，创建它
			    fs.mkdirSync(file_dir, { recursive: true });
			}
			fs.copyFileSync(imagePath, saveFileDir);
			// 延迟1分钟后删除文件
			setTimeout(() => {
				fs.unlink(imagePath, (err) => {
					if (err) {
						console.error('删除本地文件错误:', err);
					} else {
						console.log('本地文件已删除:', imagePath);
					}
				});
			}, 10000);
        } catch (error) {
            console.error('Error occurred while processing image:', error);
        }
    }

    // 移除包含 ![image] 的行和前后的空白行
    cleanedMsg = cleanedMsg.replace(/^\s*.*\!\[image\].*\n/gm, '');
	cleanedMsg = cleanedMsg.replace(/^\s*(!\[[^\]]*\]\([^)]*\))\s*$/gm, '');

    cleanedMsg = cleanedMsg.replace(/[^。]*?\[下载[^\]]*\]\((.*?)\)[^)]*?/g, '');

    // 移除包含 [下载链接] 的行和前后的空白行
    //cleanedMsg = cleanedMsg.replace(/^\s*.*\[下载链接\].*\n/gm, '');

    // 移除开头的空行
    cleanedMsg = cleanedMsg.replace(/^\s*\n/gm, '');
    try {
        cleanedMsg = replaceLongUrlsWithDomain(cleanedMsg);
    }catch (e) {
        // 移除字符串中所有位置上的 [[...]] 形式的 URL 引用
        cleanedMsg = cleanedMsg.replace(/\[\[\d+\]\(https?:\/\/[^\]]+\)\]/g, '');
    }
    console.log(cleanedMsg);
    return cleanedMsg;
}


async function send_txt_msg1(wxid, content) {
    const jpara = {
        id: getid(),
        type: TXT_MSG,
        wxid: wxid,//roomid或wxid,必填
        roomid: 'null',//此处为空
        content: 'hello word',
        nickname: "null",//此处为空
        ext: 'null'//此处为空
        //wxid:'22428457414@chatroom'

    };
    const options =
    {
        //method: 'GET',
        //url: 'https://apis.map.qq.com/ws/district/v1/list',
        url: url + '/api/sendtxtmsg',
        body: {
            para: jpara
        },
        json: true
    };
    let data = rp(options);
    //const j = JSON.parse(data);

    //console.log(j.id); 
    //console.log(j.status);
    return data;


}

ws.on('message', async (data) => {
    //break;
    //return;

    // console.log(data);
    //ws.send("hello world");
    // return;
    const j = JSON.parse(data);
    // handle_wxuser_list(j)
    console.log(j);
    const type = j.type;
	let user_id;
	let raw_msgdata;
	let msgdata;
	let roomid;
	let userid;
	let nick;
	let msgcontent;
	let atplx;
    switch (type) {
        case CHATROOM_MEMBER_NICK:
            console.log(j);
            handle_nick(j);
            break;
        case PERSONAL_DETAIL:
            console.log(j);
            break;
        case AT_MSG:
            console.log(j);
            break;
        case DEBUG_SWITCH:
            console.log(j);
            break;
        case PERSONAL_INFO:
            console.log(j);
			const bot_info = JSON.parse(j.content);
			BOT_NICKNAME = bot_info.wx_name;
			BOT_WXID = bot_info.wx_id;
            break;
        case TXT_MSG:
            // console.log(j);
            break;
        case PIC_MSG:
            console.log(j);
            break;
        case CHATROOM_MEMBER:
            // console.log(j);
            handle_memberlist(j);
            break;
        case RECV_PIC_MSG:
            // handle_recv_msg(j);
            await getFile(j);
            break;
        case RECV_TXT_MSG:
            // handle_recv_msg(j);
            // console.log("11");
            // ws.send("hello world");
            user_id = j.id1 ? j.id1 : j.wxid;
            raw_msgdata = await get_member_nick(user_id, j.wxid)
            msgdata = JSON.parse(raw_msgdata.content)
            roomid = msgdata.roomid
            userid = msgdata.wxid
            nick = msgdata.nick
            msgcontent = j.content
            if(userid === 'newsapp') {
                return;
            }
            console.log({ userid, nick, roomid, msgcontent })
			if(roomid == userid){
				if(j.content.startsWith('/s')){
				    const raw_msg = j.content.replace('/s', '').trim()
				    // userid, nick, roomid, msgcontent
				    const msg = await sparkReply(roomid, userid, nick, raw_msg)
				    //    await  send_txt_msg1(j.wxid, j.content)
				    // const new_msg = await containsTextFileLine(msg)
				    ws.send(send_txt_msg(roomid, msg));
				}else{
				    // userid, nick, roomid, msgcontent
				    const msg = await chatgptReply(roomid, userid, nick, msgcontent,'','')
				    //    await  send_txt_msg1(j.wxid, j.content)
				    // const new_msg = await containsTextFileLine(msg)
				    let new_msg = await processMessage(msg,roomid);
				    if(new_msg != ''){
				        ws.send(send_txt_msg(roomid, new_msg));
				    }
				}
				
			}else{
				atplx='@'+BOT_NICKNAME+'';
				if(j.content.startsWith(atplx)){
					const raw_msg = j.content.replace(atplx, '').trim()
				    // userid, nick, roomid, msgcontent
				    const msg = await chatgptReply(roomid, userid, nick, raw_msg,'','')
				    //    await  send_txt_msg1(j.wxid, j.content)
				    // const new_msg = await containsTextFileLine(msg)
				    let new_msg = await processMessage(msg,roomid);
				    if(new_msg != ''){
						// new_msg = `${raw_msg} \n ------------------------ \n`+new_msg;
				        // ws.send(send_txt_msg(roomid, new_msg));
                        ws.send(send_at_msg(roomid,userid,new_msg,nick));
				    }
				}
			}
            break;
		case YY_MSG:
			user_id = j.content.id2?j.content.id2:j.content.id1;
			raw_msgdata = await get_member_nick(user_id, j.content.id1)
			msgdata = JSON.parse(raw_msgdata.content)
			roomid = msgdata.roomid?msgdata.roomid:msgdata.wxid
			userid = msgdata.wxid
			nick = msgdata.nick
			msgcontent = j.content.content;
			console.log({ userid, nick, roomid, msgcontent })
			const result = await parseXml(msgcontent);
			// 输出解析后的对象，或者进行进一步处理
			console.log(result);
			msgcontent = result.msg.appmsg.title;
			const msg_type = result.msg.appmsg.type;
			let repmsg;
			if(msg_type == '57') {
				//引用消息
				if(roomid == userid){
                    let refermsg = result.msg.appmsg.refermsg;
                    if(refermsg.type == '3') {
                        //图片
                        const fileUrl = await processImageMessage(refermsg);
                        console.log(`对外文件地址：${fileUrl}`);
                        repmsg = await chatgptReply(roomid, userid, nick, msgcontent,fileUrl,'');
                    }else if (refermsg.type == '49'){
						//文件
						let refContent = refermsg.content;
						const contentResult = await parseXml(refContent);
						if(contentResult.msg.appmsg.type == '19') {
                            //聊天记录
                            let des = contentResult.msg.appmsg.des;
                            if(!des) {
                                let recorditem = await parseXml(contentResult.msg.appmsg.recorditem);
                                des = recorditem.recordinfo.info;
                            }
                            des = `{${contentResult.msg.appmsg.title}:[${des}]}`;
                            repmsg = await chatgptReply(roomid, userid, nick, msgcontent+des,'','');
						}else {
							const fileUrl = `${BACKEND_URL}/${contentResult.msg.appmsg.md5}/${contentResult.msg.appmsg.title}`;
							console.log(`对外文件地址：${fileUrl}`);
							repmsg = await chatgptReply(roomid, userid, nick, msgcontent,fileUrl,'');
						}
                    }else if (refermsg.type == '1'){
						//文本
						let refContent = refermsg.content;
						refContent = refContent.replace(/^@[^ ]+\s/, "");
                        repmsg = await chatgptReply(roomid, userid, nick, msgcontent,'',refContent);
                    }else{
						 repmsg = '暂不支持该引用类型';
					}
					let new_msg = await processMessage(repmsg,roomid);
					if(new_msg != ''){
					    ws.send(send_txt_msg(roomid, new_msg));
					}
				}else{
					atplx='@'+BOT_NICKNAME+'';
					if(msgcontent.startsWith(atplx)){
						const raw_msg = msgcontent.replace(atplx, '').trim()
                        let refermsg = result.msg.appmsg.refermsg;
                        if(refermsg.type == '3') {
                            //图片
                            const fileUrl = await processImageMessage(refermsg);
                            console.log(`对外文件地址：${fileUrl}`);
                            repmsg = await chatgptReply(roomid, userid, nick, raw_msg,fileUrl,'');
                        }else if (refermsg.type == '49'){
							//文件
							let refContent = refermsg.content;
							const contentResult = await parseXml(refContent);
							console.log(contentResult);
							if(contentResult.msg.appmsg.type == '19') {
								//聊天记录
                                let des = contentResult.msg.appmsg.des;
                                if(!des) {
                                    let recorditem = await parseXml(contentResult.msg.appmsg.recorditem);
                                    des = recorditem.recordinfo.info;
                                }
								des = `{${contentResult.msg.appmsg.title}:[${des}]}`;
								repmsg = await chatgptReply(roomid, userid, nick, msgcontent+des,'','');
							}else {
								const fileUrl = `${BACKEND_URL}/${contentResult.msg.appmsg.md5}/${contentResult.msg.appmsg.title}`;
								console.log(`对外文件地址：${fileUrl}`);
								repmsg = await chatgptReply(roomid, userid, nick, msgcontent,fileUrl,'');
							}
						}else if (refermsg.type == '1'){
							//文本
							let refContent = refermsg.content;
							refContent = refContent.replace(/^@[^ ]+\s/, "");
							repmsg = await chatgptReply(roomid, userid, nick, msgcontent,'',refContent);
						}else{
							 repmsg = '暂不支持该引用类型';
						}
					    let new_msg = await processMessage(repmsg,roomid);
					    if(new_msg != ''){
					        ws.send(send_at_msg(roomid,userid,new_msg,nick));
					    }
					}
				}
			}else if(msg_type == '6') {
				//附件消息
				let attName = result.msg.appmsg.title;
				let attMd5 = result.msg.appmsg.md5;
				const currentDate = new Date();
				const year = currentDate.getFullYear();
				const month = String(currentDate.getMonth() + 1).padStart(2, '0');
				const yearMonth = `${year}-${month}`;
				let detailFilePath = path.join(path.resolve('./WeChat Files'),BOT_WXID, 'FileStorage', 'File', yearMonth , attName);
				checkFileAndCopy(detailFilePath, attMd5, attName);
			}else if(msg_type == '19') {
				//附件消息
				let attName = result.msg.appmsg.title;
				let attMd5 = result.msg.appmsg.md5;
                if(attMd5) {
                    const currentDate = new Date();
                    const year = currentDate.getFullYear();
                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const yearMonth = `${year}-${month}`;
                    let detailFilePath = path.join(path.resolve('./WeChat Files'),BOT_WXID, 'FileStorage', 'File', yearMonth , attName);
                    checkFileAndCopy(detailFilePath, attMd5, attName);
                }
			}
			break;
        case HEART_BEAT:
            heartbeat(j);
            break;
        case USER_LIST:
            console.log(j);
            //handle_wxuser_list(j);
            break;
        case GET_USER_LIST_SUCCSESS:
            handle_wxuser_list(j);
            break;
        case GET_USER_LIST_FAIL:
            handle_wxuser_list(j);
            break;
        case NEW_FRIEND_REQUEST:
            //console.log("---------------37----------");
            console.log(j);
            break;
        case AGREE_TO_FRIEND_REQUEST:
            console.log("---------------25----------");
            console.log(j);
            break;
        //case SEND_TXT_MSG_SUCCSESS:
        //handle_recv_msg(j);
        //break;
        //case SEND_TXT_MSG_FAIL:
        //handle_recv_msg(j);
        //break;
        default:
            break;
    }
    // console.log(`Roundtrip time: ${Date.now() - data} ms`);

    /*setTimeout(function timeout() {
      ws.send(Date.now());
    }, 500);*/
});

async function processImageMessage(refermsg) {
	let refContent = refermsg.content;
	refContent = refContent.replace(/^.*?(?=&lt;\?xml version="1.0"\?&gt;)/, "");
    let refermsg_result = await parseXml(refContent);
    let refFileDir = path.join(path.resolve('./WeChat Files/file'), refermsg_result.msg.img.$.md5);
    let refFilePath = getFirstFilePath(refFileDir);
    let filename = refFilePath.split('/').pop();
    return `${BACKEND_URL}/${refermsg_result.msg.img.$.md5}/${filename}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function checkFileExists(filePath) {
    try {
        await delay(2000);
        await fsp.access(filePath, fs.constants.F_OK);
        return true;  // 文件存在
    } catch (error) {
        return false; // 文件不存在
    }
}

function checkFileAndCopy(detailFilePath, attMd5, attName, attempts = 0) {
    checkFileExists(detailFilePath).then(exists => {
        if (exists) {
            console.log('原文件存在');
            const saveFileDir = path.join(path.resolve('./WeChat Files/file'), attMd5, attName);
            let file_dir = path.dirname(saveFileDir);
            if (!fs.existsSync(file_dir)) {
                // 如果目标目录不存在，创建它
                fs.mkdirSync(file_dir, { recursive: true });
            }
            fs.copyFileSync(detailFilePath, saveFileDir);
            // 延迟10秒后删除文件
            setTimeout(() => {
                fs.unlink(detailFilePath, (err) => {
                    if (err) {
                        console.error('删除本地文件错误:', err);
                    } else {
                        console.log('本地文件已删除:', detailFilePath);
                    }
                });
            }, 10000);
        } else if (attempts < 3) {
            // 如果文件不存在，等待3秒后重试，最多重试3次
            console.log('文件不存在, 正在重试...');
            setTimeout(() => {
                checkFileAndCopy(detailFilePath, attMd5, attName, attempts + 1);
            }, 3000);
        } else {
            // 如果连续3次重试仍然失败，放弃
            console.log('重试3次后文件仍然不存在，放弃操作。');
        }
    });
}

ws.on('close', function close() {
    console.log('disconnected');
});

const basePath = path.resolve('./WeChat Files/file');

app.get('/file/:dir/:filename', async (req, res) => {
    const { dir, filename } = req.params;

    // 验证路径组件
    if (!dir.match(/^[A-Za-z0-9_-]+$/) || !filename.match(/^[A-Za-z0-9._\- ()（）\p{Script=Han}]+$/u)) {
        return res.status(400).send('Invalid directory or filename');
    }

    // 构建和规范化文件路径
    const filePath = path.join(basePath, dir, filename);
    console.log(`请求文件：${filePath}`);
    try {
        // 确保文件路径位于安全的基础路径下
        if (!filePath.startsWith(basePath)) {
            throw new Error('Access denied');
        }

        // 检查文件是否存在且可读
        await fsp.access(filePath, fs.constants.R_OK);
        res.sendFile(filePath);
    } catch (error) {
        res.status(404).send('File not found or access denied');
    }
});

const PORT = 5557;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
