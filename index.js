import WebSocket from 'ws'
import rp from 'request-promise'
import chatgptReply from "./utils/chatgpt.js"
import sparkReply from "./utils/sparkmsg.js"
import { containsTextFileLine } from "./utils/checkword.js"
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { unlink } from 'fs';
import path from 'path';
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
const SERVER_HOST = process.env.SERVER_HOST
let BOT_NICKNAME = ''
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
            await fs.access(dir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 如果目录不存在，创建它
                await fs.mkdir(dir, { recursive: true });
            } else {
                throw error; // 重新抛出其他错误
            }
        }

        // 下载图片
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(targetPath, buffer);
        console.log('Image successfully downloaded and saved to', targetPath);
    } catch (error) {
        console.error('Error occurred in downloadImage:', error);
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

    // 提取图片链接
    const imageRegex = /!\[image]\((.*?)\)/g;
    const matches = [...cleanedMsg.matchAll(imageRegex)];
    if (matches.length > 0) {
        const imageUrl = matches[0][1]; // 取第一个匹配项的URL
        console.log(imageUrl);
        
        // 图片下载和处理的代码
        const filename = 'image_' + new Date().getTime() + '.jpg';
        const imagePath = path.resolve('upload', filename);

        try {
            await downloadImage(imageUrl, imagePath);
            ws.send(send_pic_msg(roomid, filename));
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

    // 移除包含 [下载链接] 的行和前后的空白行
    cleanedMsg = cleanedMsg.replace(/^\s*.*\[下载链接\].*\n/gm, '');

    // 移除开头的空行
    cleanedMsg = cleanedMsg.replace(/^\s*\n/gm, '');
	// 移除字符串中所有位置上的 [[...]] 形式的 URL 引用
	cleanedMsg = cleanedMsg.replace(/\[\[\d+\]\(https?:\/\/[^\]]+\)\]/g, '');

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
            handle_recv_msg(j);
            break;
        case RECV_TXT_MSG:
            // handle_recv_msg(j);
            // console.log("11");
            // ws.send("hello world");
            const user_id = j.id1 ? j.id1 : j.wxid;
            const raw_msgdata = await get_member_nick(user_id, j.wxid)
            const msgdata = JSON.parse(raw_msgdata.content)
            const roomid = msgdata.roomid
            const userid = msgdata.wxid
            const nick = msgdata.nick
            const msgcontent = j.content
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
				    const msg = await chatgptReply(roomid, userid, nick, msgcontent)
				    //    await  send_txt_msg1(j.wxid, j.content)
				    // const new_msg = await containsTextFileLine(msg)
				    const new_msg = await processMessage(msg,roomid);
				    if(new_msg != ''){
				        ws.send(send_txt_msg(roomid, new_msg));
				    }
				}
				
			}else{
				const atplx='@'+BOT_NICKNAME+'';
				if(j.content.startsWith(atplx)){
					const raw_msg = j.content.replace(atplx, '').trim()
				    // userid, nick, roomid, msgcontent
				    const msg = await chatgptReply(roomid, userid, nick, raw_msg)
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


ws.on('close', function close() {
    console.log('disconnected');
});
