import schedule from "node-schedule"
import { requestPromise } from './req.js'
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import chokidar from 'chokidar';
dotenv.config()

let API = process.env.PROXY_API ? process.env.PROXY_API : 'https://api.openai.com';
let OPENAI_MODEL = process.env.OPENAI_API_MODEL ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo-16k';
let CUSTOM_PROMPT = process.env.CUSTOM_PROMPT ? process.env.CUSTOM_PROMPT : '你是ChatGPT, 一个由OpenAI训练的大型语言模型, 你旨在回答并解决人们的任何问题，并且可以使用多种语言与人交流。';
let ADMIN_WECHAT = process.env.ADMIN_WECHAT ? process.env.ADMIN_WECHAT : '';
let API_KEY = process.env.OPENAI_API_KEY
const watcher = chokidar.watch('.env');
watcher.on('change', (path) => {
  console.log(`File ${path} has been changed`);
  delete process.env.PROXY_API;
  delete process.env.OPENAI_API_MODEL;
  delete process.env.CUSTOM_PROMPT;
  delete process.env.ADMIN_WECHAT;
  delete process.env.OPENAI_API_KEY;
  dotenv.config();
  API = process.env.PROXY_API ? process.env.PROXY_API : 'https://api.openai.com';
  OPENAI_MODEL = process.env.OPENAI_API_MODEL ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo-16k';
  CUSTOM_PROMPT = process.env.CUSTOM_PROMPT ? process.env.CUSTOM_PROMPT : '你是ChatGPT, 一个由OpenAI训练的大型语言模型, 你旨在回答并解决人们的任何问题，并且可以使用多种语言与人交流。';
  ADMIN_WECHAT = process.env.ADMIN_WECHAT ? process.env.ADMIN_WECHAT : '';
  API_KEY = process.env.OPENAI_API_KEY
});
let systemMessage = {
  role: 'system',
  content: CUSTOM_PROMPT,
}

const conversationPool = new Map();

async function chatgptReply(wxid, id, nick, rawmsg,file,addHis,prompt) {
  console.log(`chat:${wxid}-------${id}\nrawmsg: ${rawmsg}`);
  let response = '🤒🤒🤒出了一点小问题，请稍后重试下...';
  let temp_model = null;
  if (rawmsg === "清除所有对话" && id === ADMIN_WECHAT) {
    conversationPool.clear()
    response = `所有的对话已清空`
    return response
  } else if (rawmsg === "结束对话") {
    conversationPool.delete(wxid);
    response = `${nick}的对话已结束`
    return response
  } else {
	if(file){
		rawmsg = [
                {
                    "type": "text",
                    "text": ""+rawmsg+""
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": ""+file+""
                    }
                }
            ]
	}
    const datatime = Date.now()
	let messages;
    if(prompt){
      systemMessage = {
        role: 'system',
        content: prompt,
      }
      messages = [systemMessage];
      if (addHis) {
        messages.push({ role: 'assistant', content: addHis });
      }
      messages.push({ role: 'user', content: rawmsg });
    }else{
      if (conversationPool.get(wxid)) {
        messages = [...conversationPool.get(wxid).messages];
        if (addHis) {
          messages.push({ role: 'assistant', content: addHis });
        }
        messages.push({ role: 'user', content: rawmsg });
      } else {
        messages = [systemMessage];
        if (addHis) {
          messages.push({ role: 'assistant', content: addHis });
        }
        messages.push({ role: 'user', content: rawmsg });
      }
    }
    const newMessage = { datatime: datatime, messages };
    const data = { model: temp_model==null?OPENAI_MODEL:temp_model, messages, stream: false };
    let raw_response

    try {
      raw_response = await requestPromise({
        url: `${API}/v1/chat/completions`,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        },
        body: data,
        method: 'POST',

      })

      // 检查返回的数据是否包含 choices 字段
      if (raw_response.data.choices && raw_response.data.choices.length > 0) {
        const response = raw_response.data.choices[0].message;
        console.log(`chat:${wxid}------${id}\nresponse: ${response.content}`);
        // 只有在成功获取到回复时，才将原始消息添加到对话池中
        if (response&&!prompt) {
          conversationPool.set(wxid, newMessage);
        }
        conversationPool.get(wxid).messages.push(response);
        return `${response.content}`;
      } else {
        console.log('Invalid response:', raw_response);
        response = '🤒🤒🤒出了一点小问题，请稍后重试下...';
      }

    } catch (e) {
      console.log(e);
      if (raw_response.response.data) {
        console.log(raw_response.response.data.error);
      } else {
        console.log(raw_response.response);
      }
      console.error(e);
    }

    return response
  }

}


const clearMap = async () => {
  const now = Date.now();
  const promises = Array.from(conversationPool.entries())
    .filter(([key, value]) => now - value.datatime >= 1000 * 600)
    .map(([key, value]) =>
      new Promise((resolve, reject) => {
        conversationPool.delete(key);
        resolve();
      })
    );

  try {
    await Promise.all(promises);
    console.log('Keys deleted successfully');
    //   console.log(conversationPool);
  } catch (err) {
    console.error(err);
  }
};

// 每隔30分钟执行一次clearMap()方法
schedule.scheduleJob('*/30 * * * *', clearMap);


export default chatgptReply