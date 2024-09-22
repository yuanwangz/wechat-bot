import { requestPromise } from './req.js'; // 替换为实际的路径
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';  // 用于将 SVG 转换为 JPG
import { promisify } from 'util';
import * as dotenv from 'dotenv';
dotenv.config()
let API = process.env.PROXY_API ? process.env.PROXY_API : 'https://api.openai.com';
let API_KEY = process.env.OPENAI_API_KEY
const writeFile = promisify(fs.writeFileSync);

// 获取数据并转换图片保存
export async function get_hyxj(msgContent) {
    try {
        const data = { text: msgContent, apiKey: API_KEY };
        let raw_response = await requestPromise({
            url: `http://bdjbt.12342234.xyz:3004/hanyuxinjie`,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            },
            body: data,
            method: 'POST',

        })
        let response ='';
        if (raw_response.image) {
            response = raw_response.image;
        } else {
            // console.log('Invalid response:', raw_response);
        }
        if(!response){
            return '';
        }
        const base64Data = response.replace(/^data:image\/png;base64,/, '');
        const md5 = crypto.createHash('md5').update(base64Data).digest('hex');
        // 保存文件的路径
        const filename = md5+'.jpg';
        let imagePath = path.resolve('upload', filename);

        // 确保保存路径的目录存在
        fs.mkdirSync(path.dirname(imagePath), { recursive: true });

        // 保存图片
        await writeFile(imagePath, base64Data, 'base64');

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

        return filename;
    } catch (error) {
        console.error('Error occurred:', error);
        return '';
    }
}

let imgpath = await get_hyxj("码农");
console.log(imgpath);