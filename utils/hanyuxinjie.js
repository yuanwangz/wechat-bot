import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';  // 用于将 SVG 转换为 JPG
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

// 启动 Puppeteer 并模拟浏览器行为
export async function get_hyxj(msgContent) {
    let browser;
    try {
        // 启动 Puppeteer 浏览器
        browser = await puppeteer.launch({
            headless: true, // 设置为 true 表示无头浏览器
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        // 创建新页面
        const page = await browser.newPage();

        // 设置请求拦截器，拦截并修改请求头
        await page.setRequestInterception(true);
        page.on('request', (interceptedRequest) => {
            if (interceptedRequest.isNavigationRequest()) {
                interceptedRequest.continue();
            } else {
                interceptedRequest.continue({
                    headers: {
                        ...interceptedRequest.headers(),
                        'Accept': '*/*',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'Accept-Language': 'zh-CN,zh;q=0.9',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                        'Origin': 'https://hanyuxinjie.com',
                        'Referer': 'https://hanyuxinjie.com/',
                        'Cookie': '_ga=GA1.1.656641480.1726150792; _clck=1bwy3xx%7C2%7Cfp4%7C0%7C1716; _clsk=1hiu4g1%7C1726150801005%7C1%7C1%7Cv.clarity.ms%2Fcollect; _ga_PCWP41T8Q0=GS1.1.1726150791.1.0.1726150808.0.0.0'
                    }
                });
            }
        });

        // 请求目标 URL
        const url = 'https://hanyuxinjie.com/api/hyxj';
        await page.goto('https://hanyuxinjie.com/');  // 确保访问主页，加载所有资源

        // 发起 POST 请求并获取数据
        const postData = { word: msgContent };
        const response = await page.evaluate(async (url, postData) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });
            return res.json();  // 返回响应 JSON
        }, url, postData);

        console.log('Response:', response);

        // 提取 SVG 数据
        const svgData = response.data.image;

        // 将 SVG 转换为 JPG
        const jpgBuffer = await sharp(Buffer.from(svgData))
            .jpeg()
            .toBuffer();

        // 计算文件的 MD5 值
        const md5 = crypto.createHash('md5').update(jpgBuffer).digest('hex');

        // 保存文件的路径
        const filename = md5 + '.jpg';
        const saveFileDir = path.join(path.resolve('./WeChat Files/file'), md5, filename);

        // 确保保存路径的目录存在
        fs.mkdirSync(path.dirname(saveFileDir), { recursive: true });

        // 保存图片
        await writeFile(saveFileDir, jpgBuffer);

        return saveFileDir;
    } catch (error) {
        console.error('Error occurred:', error);
        return '';
    } finally {
        if (browser) {
            await browser.close();  // 确保浏览器实例关闭
        }
    }
}

// (async () => {
//     let imgpath = await get_hyxj("码农");
//     console.log(imgpath);
// })();
