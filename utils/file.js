import path from "path";
import fsp from "fs/promises";
import fetch from "node-fetch";
import sharp from "sharp";
import crypto from "crypto";

export async function downloadImage(url, targetPath) {
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

        // 下载图片，默认处理重定向
        const response = await fetch(url, { redirect: 'follow' });

        // 检查是否成功响应
        if (!response.ok) {
            throw new Error(`Failed to fetch image, status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 获取文件的内容类型和扩展名
        let contentType = response.headers.get('content-type');
        let extension = contentType.split('/')[1];
        let imageExtensions = ['png', 'jpeg', 'gif', 'bmp', 'tiff', 'jpg', 'webp'];

        // 如果内容类型是图片并且扩展名是已知类型之一，使用正确的扩展名
        if (imageExtensions.includes(extension)) {
            targetPath = `${targetPath}.jpg`; // 将图片保存为jpg
            extension = 'jpg';
        } else if (extension === 'octet-stream') {
            // 如果内容是二进制流，获取文件名并扩展名
            let fileName = response.headers.get('content-disposition').split(';')[1].split('=')[1];
            extension = fileName.split('.').pop();
            targetPath = `${targetPath}.${extension}`;
        } else {
            targetPath = `${targetPath}.${extension}`;
        }

        let md5Hash;
        if (response.headers.get('content-type').includes('image/webp')) {
            // 如果是webp格式的图片，转换为jpeg
            const image = sharp(buffer).jpeg();
            await image.toFile(targetPath);
            md5Hash = crypto.createHash('md5').update(await fsp.readFile(targetPath)).digest('hex');
        } else {
            // 处理其他图片类型
            await fsp.writeFile(targetPath, buffer);
            md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        }

        console.log('Image successfully downloaded and saved to', `${targetPath}, md5: ${md5Hash}`);
        return { md5Hash, targetPath, extension };
    } catch (error) {
        console.error('Error occurred in downloadImage:', error);
        throw error;
    }
}