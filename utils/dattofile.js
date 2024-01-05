import fs from 'fs';
import path from 'path';
async function getFile(data) {
    let parsedData = data;

    // 提取需要的信息
    let aeskey = parsedData.content.content.match(/aeskey="([^"]+)"/)[1];
    let detail = parsedData.content.detail;
    let thumb = parsedData.content.thumb;
    let resultFile = '';

    // 打印提取的信息
    console.log("AES Key:", aeskey);
    console.log("Detail:", detail);
    console.log("Thumb:", thumb);
    let detailNormalizedPath = detail.split('\\').join('/');
    let detailFileLinuxPath = path.resolve('./WeChat Files', detailNormalizedPath);
    let thumbNormalizedPath = thumb.split('\\').join('/');
    let thumbFileLinuxPath = path.resolve('./WeChat Files', thumbNormalizedPath);
    console.log("Detail路径转换:", detailFileLinuxPath);
    console.log("thumb路径转换:", thumbFileLinuxPath);
    checkFileExists(detailFileLinuxPath)
        .then(exists => {
            if (exists) {
                console.log('原文件存在');
                resultFile = detailFileLinuxPath;
            } else {
                console.log('原文件不存在。使用缩略文件');
                resultFile = thumbFileLinuxPath;
            }
            decryptFile(resultFile, suffixMap,aeskey);
        });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function checkFileExists(filePath) {
    try {
        await delay(2000);
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;  // 文件存在
    } catch (error) {
        return false; // 文件不存在
    }
}

const suffixMap = {
    "ffd8ffe000104a464946": "jpg",
    "89504e470d0a1a0a0000": "png",
    "47494638396126026f01": "gif",
    "49492a00227105008037": "tif",
    "424d228c010000000000": "bmp",
    "424d8240090000000000": "bmp",
    "424d8e1b030000000000": "bmp",
};

function getXOR(fileBuffer, suffixMap) {
    for (const [key, suffix] of Object.entries(suffixMap)) {
        const hexValues = Buffer.from(key, 'hex');
        const mapValues = [];

        for (let a = 0; a < 3; a++) {
            mapValues.push(fileBuffer[a] ^ hexValues[a]);
        }

        if (mapValues[0] === mapValues[1] && mapValues[1] === mapValues[2]) {
            return [mapValues[0].toString(16), suffix, true];
        }
    }
    return ['', '', false];
}

function decryptFile(filePath, suffixMap,newFileName) {
    fs.readFile(filePath, (err, fileBuffer) => {
        if (err) {
            throw new Error('读取文件失败');
        }

        const [xorValue, suffix, ok] = getXOR(fileBuffer, suffixMap);
        if (!ok) {
            throw new Error('失败');
        }

        const xorByte = parseInt(xorValue, 16);
        const newBuffer = Buffer.from(fileBuffer.map(value => value ^ xorByte));

        const dir = path.dirname(filePath);
        const filename = path.basename(filePath, path.extname(filePath));
        const saveFileDir = path.join(path.resolve('./WeChat Files'), newFileName);
		const saveFileName = path.join(saveFileDir, filename + "." + suffix);
		if (!fs.existsSync(saveFileDir)) {
		    fs.mkdirSync(saveFileDir, { recursive: true });
		}
        fs.writeFile(saveFileName, newBuffer, (err) => {
            if (err) {
                throw new Error('保存文件失败');
            }
            console.log('文件保存成功:', saveFileName);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('删除本地文件错误:', err);
                } else {
                    console.log('本地文件已删除:', imagePath);
                }
            });
        });
    });
}

export default getFile