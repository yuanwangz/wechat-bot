import { requestPromise } from './req.js'; // 替换为实际的路径
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';  // 用于将 SVG 转换为 JPG
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

// 获取数据并转换图片保存
export async function get_hyxj(msgContent) {
    try {
        let url = 'https://hanyuxinjie.com/api/hyxj';
        const postData = {
            word: msgContent
        };

        // 使用封装的 requestPromise 发起 POST 请求
        const response = await requestPromise({
            url,
            method: 'POST',
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            },
            data: postData
        });
        console.log(response);
        const responseData = response.data;

        // 提取SVG数据
        const svgData = responseData.data.image;

        // 将SVG转换为JPG
        const jpgBuffer = await sharp(Buffer.from(svgData))
            .jpeg()
            .toBuffer();

        // 计算文件的MD5值
        const md5 = crypto.createHash('md5').update(jpgBuffer).digest('hex');

        // 保存文件的路径
        const filename = md5+'.jpg';
        const saveFileDir = path.join(path.resolve('./WeChat Files/file'), md5, filename);

        // 确保保存路径的目录存在
        fs.mkdirSync(path.dirname(saveFileDir), { recursive: true });

        // 保存图片
        await writeFile(saveFileDir, jpgBuffer);

        return saveFileDir;
    } catch (error) {
        console.error('Error occurred:', error);
        return '';
    }
}
