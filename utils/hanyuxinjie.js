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
const writeFile = promisify(fs.writeFile);

const extractSvgContent = (str) => {
    const svgRegex = /<svg[^>]*>([\s\S]*?)<\/svg>/g;
    const matches = [];
    let match;

    while ((match = svgRegex.exec(str)) !== null) {
        matches.push(match[0]); // match[0] 是完整的 <svg>...</svg> 片段
    }

    return matches;
};

// 获取数据并转换图片保存
export async function get_hyxj(msgContent) {
    let prompt = `;; 作者: 李继刚
        ;; 版本: 0.3
        ;; 模型: Claude Sonnet
        ;; 用途: 将一个汉语词汇进行全新角度的解释
        
        ;; 设定如下内容为你的 *System Prompt*
        (defun 新汉语老师 ()
        "你是年轻人,批判现实,思考深刻,语言风趣"
        (风格 . ("Oscar Wilde" "鲁迅" "罗永浩"))
        (擅长 . 一针见血)
        (表达 . 隐喻)
        (批判 . 讽刺幽默))
        
        (defun 汉语新解 (用户输入)
        "你会用一个特殊视角来解释一个词汇"
        (let (解释 (精练表达
        (隐喻 (一针见血 (辛辣讽刺 (抓住本质 用户输入))))))
        (few-shots (委婉 . "刺向他人时, 决定在剑刃上撒上止痛药。"))
        (SVG-Card 解释)))
        
        (defun SVG-Card (解释)
        "输出SVG 卡片"
        (setq design-rule "合理使用负空间，整体排版要有呼吸感"
        design-principles '(干净 简洁 典雅))
        
        (设置画布 '(宽度 400 高度 600 边距 20))
        (标题字体 '毛笔楷体)
        (自动缩放 '(最小字号 16))
        
        (配色风格 '((背景色 (蒙德里安风格 设计感)))
        (主要文字 (汇文明朝体 粉笔灰))
        (装饰图案 随机几何图))
        
        (卡片元素 ((居中标题 "汉语新解")
        分隔线
        (排版输出 用户输入 英文 日语)
        解释
        (线条图 (批判内核 解释))
        (极简总结 线条图))))
        
        ;; 运行规则
        ;; 1. 启动时调用主函数 (汉语新解 ${msgContent})
        `;
    let messages;
    messages = [{ role: 'user', content: prompt }]
    try {
        const data = { model: 'claude-3-5-sonnet', messages, stream: false };
        let raw_response = await requestPromise({
            url: `${API}/v1/chat/completions`,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            },
            body: data,
            method: 'POST',

        })
        let response ='';
        // 检查返回的数据是否包含 choices 字段
        if (raw_response.data.choices && raw_response.data.choices.length > 0) {
            response = raw_response.data.choices[0].message;
        } else {
            console.log('Invalid response:', raw_response);
        }
        if(!response){
            return '';
        }
        const svgContents = extractSvgContent(response.content);
        console.log(svgContents.length)
        if(svgContents.length<1){
            return '';
        }
        // 提取SVG数据
        const svgData = svgContents[0];
        console.log(svgData)

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

let imgpath = await get_hyxj("码农");
console.log(imgpath);